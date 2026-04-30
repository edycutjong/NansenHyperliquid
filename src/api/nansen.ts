/**
 * Nansen Hyperliquid API client — direct HTTP calls
 *
 * 3 endpoints: perp-leaderboard, perp-positions, perp-trades
 */

import type {
  LeaderboardResponse,
  PositionsResponse,
  TradesResponse,
} from "./types.js";

const API_BASE = "https://api.nansen.ai/api/v1";

function getApiKey(): string {
  const key = process.env.NANSEN_API_KEY;
  if (!key) throw new Error("NANSEN_API_KEY environment variable is required");
  return key;
}

async function nansenPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apiKey: getApiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Nansen API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Discover top perpetual traders by PnL and ROI
 */
export async function fetchLeaderboard(options: {
  dateFrom: string;
  dateTo: string;
  minPnl?: number;
  minRoi?: number;
  minAccountValue?: number;
  labels?: string[];
  page?: number;
  perPage?: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
}): Promise<LeaderboardResponse> {
  const filters: Record<string, unknown> = {};
  if (options.minPnl) filters.total_pnl = { min: options.minPnl };
  if (options.minRoi) filters.roi = { min: options.minRoi };
  if (options.minAccountValue) filters.account_value = { min: options.minAccountValue };
  if (options.labels?.length) filters.include_smart_money_labels = options.labels;

  return nansenPost<LeaderboardResponse>("/perp-leaderboard", {
    date: { from: options.dateFrom, to: options.dateTo },
    filters,
    pagination: {
      page: options.page ?? 1,
      per_page: options.perPage ?? 20,
    },
    order_by: [{
      field: options.orderBy ?? "total_pnl",
      direction: options.orderDir ?? "DESC",
    }],
  });
}

/**
 * Fetch current open positions for a trader
 */
export async function fetchPositions(
  address: string,
  orderBy = "position_value_usd",
  orderDir: "ASC" | "DESC" = "DESC",
): Promise<PositionsResponse> {
  return nansenPost<PositionsResponse>("/profiler/perp-positions", {
    address,
    order_by: [{ field: orderBy, direction: orderDir }],
  });
}

/**
 * Fetch recent trades for a trader
 */
export async function fetchTrades(options: {
  address: string;
  dateFrom: string;
  dateTo: string;
  minValueUsd?: number;
  page?: number;
  perPage?: number;
}): Promise<TradesResponse> {
  const filters: Record<string, unknown> = {};
  if (options.minValueUsd) filters.value_usd = { min: options.minValueUsd };

  return nansenPost<TradesResponse>("/profiler/perp-trades", {
    address: options.address,
    date: { from: options.dateFrom, to: options.dateTo },
    filters,
    pagination: {
      page: options.page ?? 1,
      per_page: options.perPage ?? 100,
    },
    order_by: [{ field: "timestamp", direction: "DESC" }],
  });
}
