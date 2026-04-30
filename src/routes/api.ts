/**
 * API routes for Hyperliquid tracker data
 */

import { Router } from "express";
import { getState, getConfig, discoverTraders, pollCycle } from "../services/tracker.js";

const router = Router();

/**
 * GET /api/dashboard — full daemon state for frontend
 */
router.get("/dashboard", (_req, res) => {
  const state = getState();
  const config = getConfig();
  res.json({ state, config, cacheHit: false });
});

/**
 * GET /api/traders — all tracked traders
 */
router.get("/traders", (_req, res) => {
  const state = getState();
  res.json({
    traders: state.traders,
    count: state.traders.length,
    lastPollAt: state.lastPollAt,
  });
});

/**
 * GET /api/traders/:address — single trader detail
 */
router.get("/traders/:address", (req, res) => {
  const address = req.params.address.toLowerCase();
  const state = getState();
  const trader = state.traders.find(
    (t) => t.address.toLowerCase() === address,
  );

  if (!trader) {
    res.status(404).json({
      error: `Trader "${req.params.address}" not tracked`,
      tracked: state.traders.map((t) => t.address),
    });
    return;
  }

  res.json(trader);
});

/**
 * GET /api/alerts — recent alerts
 */
router.get("/alerts", (req, res) => {
  const state = getState();
  const limit = Math.min(parseInt(String(req.query.limit) || "50", 10), 200);
  res.json({
    alerts: state.alerts.slice(0, limit),
    total: state.alerts.length,
  });
});

/**
 * GET /api/leaderboard — discover/refresh leaderboard
 */
router.get("/leaderboard", async (_req, res) => {
  try {
    const traders = await discoverTraders();
    res.json({ traders, count: traders.length });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Discovery failed",
    });
  }
});

/**
 * POST /api/poll — trigger manual poll cycle
 */
router.post("/poll", async (_req, res) => {
  try {
    await pollCycle();
    const state = getState();
    res.json({
      message: "Poll complete",
      pollCount: state.pollCount,
      traders: state.traders.length,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Poll failed",
    });
  }
});

export default router;
