import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { cacheGet, cacheSet, cacheClear, cacheSize } from "../src/services/cache.js";

describe("Cache Service", () => {
  beforeEach(() => cacheClear());

  it("returns null for missing keys", () => {
    assert.equal(cacheGet("x"), null);
  });

  it("stores and retrieves values", () => {
    cacheSet("k", { v: 42 });
    assert.deepEqual(cacheGet("k"), { v: 42 });
  });

  it("expires entries", async () => {
    cacheSet("e", "data", 1);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(cacheGet("e"), null);
  });

  it("tracks size", () => {
    cacheSet("a", 1); cacheSet("b", 2);
    assert.equal(cacheSize(), 2);
  });

  it("clears all", () => {
    cacheSet("x", 1); cacheClear();
    assert.equal(cacheSize(), 0);
  });
});
