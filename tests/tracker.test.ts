import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getState, getConfig, discoverTraders, updateTrader, pollCycle } from "../src/services/tracker.js";
import * as cacheService from "../src/services/cache.js";
import { TrackedTrader } from "../src/api/types.js";

describe("Tracker", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NANSEN_API_KEY = "test-key";
    
    // Silence console.log
    mock.method(console, "log", () => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    mock.restoreAll();
    cacheService.cacheClear();
  });

  describe("Initial State", () => {
    it("starts with empty traders", () => {
      const state = getState();
      assert.equal(state.traders.length, 0);
    });

    it("starts with zero poll count", () => {
      const state = getState();
      assert.equal(state.pollCount, 0);
    });

    it("starts with empty alerts", () => {
      const state = getState();
      assert.equal(state.alerts.length, 0);
    });

    it("has empty timestamps", () => {
      const state = getState();
      assert.equal(state.discoveredAt, "");
      assert.equal(state.lastPollAt, "");
    });
  });

  describe("Config", () => {
    it("returns a valid config object", () => {
      const cfg = getConfig();
      assert.ok(cfg.pollIntervalSec > 0);
      assert.ok(cfg.minPnl > 0);
      assert.ok(cfg.topTraders > 0);
    });
  });

  describe("discoverTraders", () => {
    it("fetches leaderboard and returns initialized traders", async () => {
      mock.method(global, "fetch", async (url: string | URL | Request) => {
        if (url.toString().includes("perp-leaderboard")) {
          return {
            ok: true,
            json: async () => ({
              data: [
                { trader_address: "0xABC", trader_address_label: "Alice", total_pnl: 10000, roi: 50, account_value: 5000 },
              ]
            })
          };
        }
      });

      const traders = await discoverTraders();
      assert.equal(traders.length, 1);
      assert.equal(traders[0].address, "0xABC");
      assert.equal(traders[0].label, "Alice");
      assert.equal(traders[0].totalPnl, 10000);
      assert.deepEqual(traders[0].positions, []);
    });

    it("returns cached traders if available", async () => {
      cacheService.cacheSet("leaderboard:discovery", [{ address: "0xCACHED" }]);
      const traders = await discoverTraders();
      assert.equal(traders[0].address, "0xCACHED");
    });

    it("handles missing data from API", async () => {
      mock.method(global, "fetch", async (url: string | URL | Request) => {
        if (url.toString().includes("perp-leaderboard")) {
          return {
            ok: true,
            json: async () => ({}) // missing data array
          };
        }
      });

      cacheService.cacheClear(); // clear cache from previous test
      const traders = await discoverTraders();
      assert.equal(traders.length, 0);
    });
  });

  describe("updateTrader", () => {
    it("fetches positions and trades, updates state and adds alerts", async () => {
      const trader: TrackedTrader = {
        address: "0xDEF",
        label: "Bob",
        totalPnl: 100,
        roi: 10,
        accountValue: 1000,
        positions: [{
          token_symbol: "OLD", size: 1, position_value_usd: 100, leverage_value: 1, entry_price_usd: 100, mark_price_usd: 100, unrealized_pnl_usd: 10
        }],
        recentTrades: [],
        lastUpdated: ""
      };

      mock.method(global, "fetch", async (url: string | URL | Request) => {
        if (url.toString().includes("perp-positions")) {
          return {
            ok: true,
            json: async () => ({
              data: [
                { token_symbol: "BTC", size: 2, position_value_usd: 200, leverage_value: 2, entry_price_usd: 100 }
              ]
            })
          };
        } else if (url.toString().includes("perp-trades")) {
          return {
            ok: true,
            json: async () => ({
              data: [
                { token_symbol: "ETH", side: "Long", action: "Open", value_usd: 500, size: 5, price: 100, timestamp: "now", closed_pnl: 0 }
              ]
            })
          };
        }
      });

      const updated = await updateTrader(trader);
      
      assert.equal(updated.positions.length, 1);
      assert.equal(updated.positions[0].token_symbol, "BTC");
      assert.equal(updated.recentTrades.length, 1);
      assert.equal(updated.recentTrades[0].token_symbol, "ETH");

      // Verify alerts generated
      const state = getState();
      // Should have: OLD closed, BTC opened, ETH trade
      assert.equal(state.alerts.length, 3);
      assert.ok(state.alerts.find(a => a.type === "position_closed" && a.symbol === "OLD"));
      assert.ok(state.alerts.find(a => a.type === "new_position" && a.symbol === "BTC"));
      assert.ok(state.alerts.find(a => a.type === "new_trade" && a.symbol === "ETH"));
    });

    it("handles errors gracefully", async () => {
      const trader: TrackedTrader = {
        address: "0xERR", label: "", totalPnl: 0, roi: 0, accountValue: 0, positions: [], recentTrades: [], lastUpdated: ""
      };

      mock.method(global, "fetch", async () => {
        return { ok: false, status: 500, text: async () => "API Error" };
      });

      const updated = await updateTrader(trader);
      assert.ok(updated.error?.includes("API Error"));
    });

    it("handles trades error but position success", async () => {
      const trader: TrackedTrader = {
        address: "0xERR_TRADES", label: "", totalPnl: 0, roi: 0, accountValue: 0, positions: [], recentTrades: [], lastUpdated: ""
      };

      mock.method(global, "fetch", async (url: string | URL | Request) => {
        if (url.toString().includes("perp-positions")) {
          return { ok: true, json: async () => ({ data: [] }) };
        } else if (url.toString().includes("perp-trades")) {
          return { ok: false, status: 500, text: async () => "Error" };
        }
      });

      const updated = await updateTrader(trader);
      assert.deepEqual(updated.positions, []);
      assert.deepEqual(updated.recentTrades, []);
      assert.equal(updated.error, undefined);
    });

    it("returns cached trader if available", async () => {
      const trader: TrackedTrader = {
        address: "0xCACHED_TRADER", label: "", totalPnl: 0, roi: 0, accountValue: 0,
        positions: [], recentTrades: [], lastUpdated: ""
      };
      cacheService.cacheSet("trader:0xCACHED_TRADER", trader);
      const updated = await updateTrader(trader);
      assert.equal(updated.address, "0xCACHED_TRADER");
    });

    it("handles missing data arrays, string errors, and specific diffing branches including short positions", async () => {
      const trader: TrackedTrader = {
        address: "0xMISSING", label: "Missing", totalPnl: 0, roi: 0, accountValue: 0,
        positions: [
          // This will be closed in diff, and we need unrealized_pnl_usd to be missing
          { token_symbol: "OLD2", size: -1, position_value_usd: 100, leverage_value: 1, entry_price_usd: 100, mark_price_usd: 100, unrealized_pnl_usd: 0 }
        ],
        recentTrades: [], lastUpdated: ""
      };

      // Test String error first
      mock.method(global, "fetch", async (url: string | URL | Request) => {
        if (url.toString().includes("perp-positions")) {
          throw "String API Error";
        }
      });
      const errRes = await updateTrader(trader);
      assert.ok(errRes.error?.includes("String API Error"));

      // Test missing data arrays & closed_pnl
      mock.method(global, "fetch", async (url: string | URL | Request) => {
        if (url.toString().includes("perp-positions")) {
          return { 
            ok: true, 
            json: async () => ({}) // Missing array -> defaults to []
          };
        } else if (url.toString().includes("perp-trades")) {
          return { 
            ok: true, 
            json: async () => ({ 
              data: [
                { token_symbol: "ETH", side: "Short", action: "Close", value_usd: 500, size: 5, price: 100, timestamp: "now", closed_pnl: 50 }
              ] 
            }) 
          };
        }
      });
      
      const updated = await updateTrader(trader);
      assert.deepEqual(updated.positions, []);
      assert.equal(updated.recentTrades.length, 1);
      assert.equal(updated.recentTrades[0].closed_pnl, 50);

      const state = getState();
      // Should have position_closed for OLD2
      const oldAlert = state.alerts.find(a => a.type === "position_closed" && a.symbol === "OLD2");
      assert.ok(oldAlert);
      assert.ok(oldAlert.details.includes("$0.00")); // fallback to 0

      // Should have new_trade with closed_pnl formatted
      const tradeAlert = state.alerts.find(a => a.type === "new_trade" && a.symbol === "ETH" && a.details.includes("PnL"));
      assert.ok(tradeAlert);
    });

    it("handles specific diffing branches including short positions", async () => {
      const trader: TrackedTrader = {
        address: "0xSHORT_TEST", label: "ShortTest", totalPnl: 0, roi: 0, accountValue: 0,
        positions: [], recentTrades: [], lastUpdated: ""
      };

      mock.method(global, "fetch", async (url: string | URL | Request) => {
        if (url.toString().includes("perp-positions")) {
          return { 
            ok: true, 
            json: async () => ({
              data: [
                { token_symbol: "SHORT", size: -1, position_value_usd: 100, leverage_value: 1, entry_price_usd: 100 }
              ]
            }) 
          }; // Returns a short position to trigger the 'Short' branch on line 157
        } else if (url.toString().includes("perp-trades")) {
          return { ok: true, json: async () => ({ data: [] }) };
        }
      });

      const updated = await updateTrader(trader);
      assert.equal(updated.positions.length, 1);

      const state = getState();
      // Should have new_position for SHORT (triggering Short side)
      const shortAlert = state.alerts.find(a => a.type === "new_position" && a.symbol === "SHORT" && a.side === "Short");
      assert.ok(shortAlert);
    });

    it("handles missing trades data array", async () => {
      const trader: TrackedTrader = {
        address: "0xMISSING2", label: "", totalPnl: 0, roi: 0, accountValue: 0,
        positions: [], recentTrades: [], lastUpdated: ""
      };
      mock.method(global, "fetch", async (url: string | URL | Request) => {
        if (url.toString().includes("perp-positions")) {
          return { ok: true, json: async () => ({ data: [] }) };
        } else if (url.toString().includes("perp-trades")) {
          return { ok: true, json: async () => ({}) }; // Missing data array -> defaults to []
        }
      });
      const updated = await updateTrader(trader);
      assert.deepEqual(updated.recentTrades, []);
    });
  });

  describe("pollCycle", () => {
    it("discovers traders and updates them", async () => {
      mock.method(global, "fetch", async (url: string | URL | Request) => {
        if (url.toString().includes("perp-leaderboard")) {
          return {
            ok: true,
            json: async () => ({
              data: [
                { trader_address: "0x1", total_pnl: 100 },
                { trader_address: "0x2", total_pnl: 200 }
              ]
            })
          };
        } else if (url.toString().includes("perp-positions")) {
          return { ok: true, json: async () => ({ data: [] }) };
        } else if (url.toString().includes("perp-trades")) {
          return { ok: true, json: async () => ({ data: [] }) };
        }
      });

      // Clear alerts from previous tests just in case
      getState().alerts = [];

      await pollCycle();
      const state = getState();
      
      assert.equal(state.traders.length, 2);
      assert.equal(state.pollCount, 1);
      
      // Sorted by PNL
      assert.equal(state.traders[0].address, "0x2");
      assert.equal(state.traders[1].address, "0x1");
    });
  });
});
