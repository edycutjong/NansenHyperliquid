/**
 * Hyperliquid Copytrade Tracker — core business logic
 *
 * Discovery → Position Monitoring → Trade Tracking → Alerting
 */

import { fetchLeaderboard, fetchPositions, fetchTrades } from "../api/nansen.js";
import { cacheGet, cacheSet } from "./cache.js";
import { loadConfig } from "./config.js";
import type {
  TrackedTrader,
  DaemonState,
  TradeAlert,
  PerpPosition,
  PerpTrade,
  DaemonConfig,
} from "../api/types.js";

// In-memory state
let state: DaemonState = {
  traders: [],
  discoveredAt: "",
  lastPollAt: "",
  pollCount: 0,
  alerts: [],
};

const MAX_ALERTS = 200;

export function getState(): DaemonState {
  return state;
}

export function getConfig(): DaemonConfig {
  return loadConfig();
}

/**
 * Step 1: Discover top traders from leaderboard
 */
export async function discoverTraders(): Promise<TrackedTrader[]> {
  const config = loadConfig();
  const cacheKey = "leaderboard:discovery";
  const cached = cacheGet<TrackedTrader[]>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const res = await fetchLeaderboard({
    dateFrom: monthAgo.toISOString().split("T")[0],
    dateTo: now.toISOString().split("T")[0],
    minPnl: config.minPnl,
    minRoi: config.minRoi,
    minAccountValue: config.minAccountValue,
    labels: ["Fund", "Smart Trader"],
    perPage: config.topTraders,
  });

  const traders: TrackedTrader[] = (res.data || []).map((t) => ({
    address: t.trader_address,
    label: t.trader_address_label,
    totalPnl: t.total_pnl,
    roi: t.roi,
    accountValue: t.account_value,
    positions: [],
    recentTrades: [],
    lastUpdated: new Date().toISOString(),
  }));

  cacheSet(cacheKey, traders, 10 * 60 * 1000); // Cache for 10 min
  return traders;
}

/**
 * Step 2: Fetch positions and trades for a single trader
 */
export async function updateTrader(trader: TrackedTrader): Promise<TrackedTrader> {
  const cacheKey = `trader:${trader.address}`;
  const cached = cacheGet<TrackedTrader>(cacheKey);
  if (cached) return cached;

  const previousPositions = [...trader.positions];

  try {
    // Fetch current positions
    const posRes = await fetchPositions(trader.address);
    const positions: PerpPosition[] = posRes.data || [];

    // Fetch recent trades (last 24hr)
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let recentTrades: PerpTrade[] = [];
    try {
      const tradeRes = await fetchTrades({
        address: trader.address,
        dateFrom: dayAgo.toISOString(),
        dateTo: now.toISOString(),
        minValueUsd: 5000,
      });
      recentTrades = tradeRes.data || [];
    } catch {
      // Trades endpoint may fail — graceful fallback
    }

    // Generate alerts by diffing positions
    const alerts = diffPositions(trader, previousPositions, positions, recentTrades);

    const updated: TrackedTrader = {
      ...trader,
      positions,
      recentTrades,
      lastUpdated: new Date().toISOString(),
    };

    cacheSet(cacheKey, updated);

    // Append alerts to global state
    if (alerts.length > 0) {
      state.alerts = [...alerts, ...state.alerts].slice(0, MAX_ALERTS);
    }

    return updated;
  } catch (err) {
    return {
      ...trader,
      lastUpdated: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Diff old vs new positions to generate alerts
 */
function diffPositions(
  trader: TrackedTrader,
  oldPositions: PerpPosition[],
  newPositions: PerpPosition[],
  recentTrades: PerpTrade[],
): TradeAlert[] {
  const alerts: TradeAlert[] = [];
  const now = new Date().toISOString();

  const oldSymbols = new Set(oldPositions.map((p) => p.token_symbol));
  const newSymbols = new Set(newPositions.map((p) => p.token_symbol));

  // New positions opened
  for (const pos of newPositions) {
    if (!oldSymbols.has(pos.token_symbol)) {
      alerts.push({
        timestamp: now,
        traderAddress: trader.address,
        traderLabel: trader.label,
        type: "new_position",
        symbol: pos.token_symbol,
        side: pos.size > 0 ? "Long" : "Short",
        action: "Open",
        valueUsd: pos.position_value_usd,
        details: `${pos.leverage_value}x leverage, entry $${pos.entry_price_usd.toFixed(2)}`,
      });
    }
  }

  // Positions closed
  for (const pos of oldPositions) {
    if (!newSymbols.has(pos.token_symbol)) {
      alerts.push({
        timestamp: now,
        traderAddress: trader.address,
        traderLabel: trader.label,
        type: "position_closed",
        symbol: pos.token_symbol,
        side: pos.size > 0 ? "Long" : "Short",
        action: "Close",
        valueUsd: pos.position_value_usd,
        details: `PnL: $${(pos.unrealized_pnl_usd || 0).toFixed(2)}`,
      });
    }
  }

  // New trades (from trade feed)
  for (const trade of recentTrades.slice(0, 5)) {
    if (trade.action === "Open" || trade.action === "Close") {
      alerts.push({
        timestamp: trade.timestamp,
        traderAddress: trader.address,
        traderLabel: trader.label,
        type: "new_trade",
        symbol: trade.token_symbol,
        side: trade.side,
        action: trade.action,
        valueUsd: trade.value_usd,
        details: `$${trade.price.toFixed(2)} × ${trade.size}${trade.closed_pnl ? ` | PnL: $${trade.closed_pnl.toFixed(2)}` : ""}`,
      });
    }
  }

  return alerts;
}

/**
 * Full poll cycle: discover + update all traders
 */
export async function pollCycle(): Promise<void> {
  const start = Date.now();

  // Step 1: Discover (or use cached) traders
  const traders = await discoverTraders();

  // Step 2: Update each trader in parallel (batched to avoid rate limits)
  const batchSize = 5;
  const updatedTraders: TrackedTrader[] = [];

  for (let i = 0; i < traders.length; i += batchSize) {
    const batch = traders.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(updateTrader));
    updatedTraders.push(...results);
  }

  // Sort by total PnL descending
  updatedTraders.sort((a, b) => b.totalPnl - a.totalPnl);

  // Update state
  state = {
    ...state,
    traders: updatedTraders,
    discoveredAt: state.discoveredAt || new Date().toISOString(),
    lastPollAt: new Date().toISOString(),
    pollCount: state.pollCount + 1,
  };

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const posCount = updatedTraders.reduce((s, t) => s + t.positions.length, 0);
  const alertCount = state.alerts.length;

  console.log(
    `  [Poll #${state.pollCount}] ${updatedTraders.length} traders | ${posCount} positions | ${alertCount} alerts | ${elapsed}s`,
  );
}
