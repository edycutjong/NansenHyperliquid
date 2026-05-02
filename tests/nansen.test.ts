import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fetchLeaderboard, fetchPositions, fetchTrades } from "../src/api/nansen.js";

describe("Nansen API Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    mock.restoreAll();
  });

  it("throws error if NANSEN_API_KEY is not set", async () => {
    delete process.env.NANSEN_API_KEY;
    await assert.rejects(
      async () => fetchPositions("0x123"),
      /NANSEN_API_KEY environment variable is required/
    );
  });

  it("handles non-ok responses", async () => {
    process.env.NANSEN_API_KEY = "test-key";
    
    mock.method(global, "fetch", async () => {
      return {
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      };
    });

    await assert.rejects(
      async () => fetchPositions("0x123"),
      /Nansen API 400: Bad Request/
    );
  });

  it("handles fetchLeaderboard success", async () => {
    process.env.NANSEN_API_KEY = "test-key";
    
    const mockData = { data: [{ trader_address: "0x123", total_pnl: 50000 }] };
    mock.method(global, "fetch", async (url: string | URL | Request, options: RequestInit | undefined) => {
      assert.ok(url.toString().includes("/perp-leaderboard"));
      assert.equal(options.headers.apiKey, "test-key");
      
      const body = JSON.parse(options.body);
      assert.equal(body.date.from, "2023-01-01");
      assert.equal(body.date.to, "2023-01-02");
      assert.equal(body.filters.total_pnl.min, 100);
      assert.equal(body.filters.roi.min, 10);
      assert.equal(body.filters.account_value.min, 1000);
      assert.deepEqual(body.filters.include_smart_money_labels, ["Smart"]);
      
      return {
        ok: true,
        json: async () => mockData,
      };
    });

    const res = await fetchLeaderboard({
      dateFrom: "2023-01-01",
      dateTo: "2023-01-02",
      minPnl: 100,
      minRoi: 10,
      minAccountValue: 1000,
      labels: ["Smart"],
    });
    assert.deepEqual(res, mockData);
  });

  it("handles fetchPositions success", async () => {
    process.env.NANSEN_API_KEY = "test-key";
    
    const mockData = { data: [{ token_symbol: "BTC", size: 1 }] };
    mock.method(global, "fetch", async (url: string | URL | Request, options: RequestInit | undefined) => {
      assert.ok(url.toString().includes("/profiler/perp-positions"));
      
      const body = JSON.parse(options.body);
      assert.equal(body.address, "0x123");
      
      return {
        ok: true,
        json: async () => mockData,
      };
    });

    const res = await fetchPositions("0x123");
    assert.deepEqual(res, mockData);
  });

  it("handles fetchTrades success", async () => {
    process.env.NANSEN_API_KEY = "test-key";
    
    const mockData = { data: [{ token_symbol: "ETH", side: "Long", action: "Open" }] };
    mock.method(global, "fetch", async (url: string | URL | Request, options: RequestInit | undefined) => {
      assert.ok(url.toString().includes("/profiler/perp-trades"));
      
      const body = JSON.parse(options.body);
      assert.equal(body.address, "0x123");
      assert.equal(body.filters.value_usd.min, 500);
      
      return {
        ok: true,
        json: async () => mockData,
      };
    });

    const res = await fetchTrades({
      address: "0x123",
      dateFrom: "2023-01-01",
      dateTo: "2023-01-02",
      minValueUsd: 500,
    });
    assert.deepEqual(res, mockData);
  });
});
