import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  LeaderboardTrader,
  PerpPosition,
  PerpTrade,
  TrackedTrader,
  TradeAlert,
  DaemonState,
  DaemonConfig,
} from "../src/api/types.js";

describe("API Types", () => {
  it("LeaderboardTrader has required fields", () => {
    const t: LeaderboardTrader = {
      trader_address: "0x1234",
      total_pnl: 50000,
      roi: 120,
      account_value: 200000,
    };
    assert.equal(t.trader_address, "0x1234");
    assert.ok(t.total_pnl > 0);
  });

  it("PerpPosition represents an open position", () => {
    const p: PerpPosition = {
      token_symbol: "BTC",
      size: 0.5,
      position_value_usd: 50000,
      unrealized_pnl_usd: 2500,
      leverage_value: 10,
      entry_price_usd: 95000,
      mark_price_usd: 100000,
    };
    assert.equal(p.token_symbol, "BTC");
    assert.ok(p.size > 0, "Positive size = long");
  });

  it("PerpPosition negative size = short", () => {
    const p: PerpPosition = {
      token_symbol: "ETH",
      size: -2.0,
      position_value_usd: 6000,
      unrealized_pnl_usd: -200,
      leverage_value: 5,
      entry_price_usd: 3100,
      mark_price_usd: 3000,
    };
    assert.ok(p.size < 0, "Negative size = short");
  });

  it("PerpTrade has action types", () => {
    const t: PerpTrade = {
      timestamp: new Date().toISOString(),
      token_symbol: "BTC",
      side: "Long",
      action: "Open",
      price: 100000,
      size: 0.1,
      value_usd: 10000,
      start_position: 0,
    };
    assert.equal(t.action, "Open");
    assert.equal(t.side, "Long");
  });

  it("TrackedTrader aggregates data", () => {
    const trader: TrackedTrader = {
      address: "0xabc",
      totalPnl: 50000,
      roi: 120,
      accountValue: 200000,
      positions: [],
      recentTrades: [],
      lastUpdated: new Date().toISOString(),
    };
    assert.equal(trader.positions.length, 0);
    assert.ok(trader.roi > 100);
  });

  it("TradeAlert captures position changes", () => {
    const alert: TradeAlert = {
      timestamp: new Date().toISOString(),
      traderAddress: "0xabc",
      type: "new_position",
      symbol: "BTC",
      side: "Long",
      action: "Open",
      valueUsd: 50000,
      details: "10x leverage, entry $100000",
    };
    assert.equal(alert.type, "new_position");
    assert.equal(alert.symbol, "BTC");
  });

  it("DaemonState tracks polling", () => {
    const s: DaemonState = {
      traders: [],
      discoveredAt: "",
      lastPollAt: "",
      pollCount: 0,
      alerts: [],
    };
    assert.equal(s.pollCount, 0);
  });

  it("DaemonConfig has all knobs", () => {
    const c: DaemonConfig = {
      pollIntervalSec: 300,
      minPnl: 10000,
      minRoi: 20,
      minAccountValue: 50000,
      topTraders: 20,
      cacheTtlSec: 120,
    };
    assert.equal(Object.keys(c).length, 6);
  });
});
