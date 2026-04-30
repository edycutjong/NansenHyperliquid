import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getState, getConfig } from "../src/services/tracker.js";

describe("Tracker", () => {
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
});
