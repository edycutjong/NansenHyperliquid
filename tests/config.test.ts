import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/services/config.js";

describe("Config", () => {
  it("returns default values", () => {
    const cfg = loadConfig();
    assert.equal(typeof cfg.pollIntervalSec, "number");
    assert.equal(typeof cfg.minPnl, "number");
    assert.equal(typeof cfg.minRoi, "number");
    assert.equal(typeof cfg.minAccountValue, "number");
    assert.equal(typeof cfg.topTraders, "number");
    assert.equal(typeof cfg.cacheTtlSec, "number");
  });

  it("has reasonable defaults", () => {
    const cfg = loadConfig();
    assert.ok(cfg.pollIntervalSec >= 60, "Poll interval should be at least 60s");
    assert.ok(cfg.minPnl >= 1000, "Min PnL should be meaningful");
    assert.ok(cfg.topTraders >= 1, "Should track at least 1 trader");
    assert.ok(cfg.topTraders <= 100, "Should not track more than 100");
  });
});
