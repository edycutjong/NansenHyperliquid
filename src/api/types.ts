/**
 * Nansen Hyperliquid API types
 *
 * Covers: perp-leaderboard, perp-positions, perp-trades
 */

// --- Perp Leaderboard ---

export interface LeaderboardTrader {
  trader_address: string;
  trader_address_label?: string;
  total_pnl: number;
  roi: number;
  account_value: number;
  nof_trades?: number;
  win_rate?: number;
}

export interface LeaderboardResponse {
  data: LeaderboardTrader[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
  };
}

// --- Perp Positions ---

export interface PerpPosition {
  token_symbol: string;
  size: number;
  position_value_usd: number;
  unrealized_pnl_usd: number;
  leverage_value: number;
  entry_price_usd: number;
  mark_price_usd: number;
  liquidation_price_usd?: number;
}

export interface PositionsResponse {
  data: PerpPosition[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
  };
}

// --- Perp Trades ---

export interface PerpTrade {
  timestamp: string;
  token_symbol: string;
  side: "Long" | "Short";
  action: "Open" | "Add" | "Close" | "Reduce";
  price: number;
  size: number;
  value_usd: number;
  start_position: number;
  closed_pnl?: number;
  fee_usd?: number;
}

export interface TradesResponse {
  data: PerpTrade[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
  };
}

// --- Aggregated Trader Profile ---

export interface TrackedTrader {
  address: string;
  label?: string;
  totalPnl: number;
  roi: number;
  accountValue: number;
  positions: PerpPosition[];
  recentTrades: PerpTrade[];
  lastUpdated: string;
  error?: string;
}

export interface DaemonState {
  traders: TrackedTrader[];
  discoveredAt: string;
  lastPollAt: string;
  pollCount: number;
  alerts: TradeAlert[];
}

export interface TradeAlert {
  timestamp: string;
  traderAddress: string;
  traderLabel?: string;
  type: "new_position" | "position_closed" | "position_changed" | "new_trade";
  symbol: string;
  side: string;
  action: string;
  valueUsd: number;
  details: string;
}

export interface DashboardData {
  state: DaemonState;
  config: DaemonConfig;
  cacheHit: boolean;
}

export interface DaemonConfig {
  pollIntervalSec: number;
  minPnl: number;
  minRoi: number;
  minAccountValue: number;
  topTraders: number;
  cacheTtlSec: number;
}
