/**
 * Hyperliquid Copytrade Daemon — autonomous polling loop
 *
 * Runs as a standalone process that continuously monitors
 * top Hyperliquid traders and exposes results via REST API.
 */

import "dotenv/config";
import { loadConfig } from "./services/config.js";
import { pollCycle } from "./services/tracker.js";
import { startServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();

  console.log(`\n  ⚡ NansenHyperliquid Daemon`);
  console.log(`  ──────────────────────────`);
  console.log(`  Mode:         Autonomous Copytrade Tracker`);
  console.log(`  Poll:         Every ${config.pollIntervalSec}s`);
  console.log(`  Filters:      PnL ≥ $${config.minPnl} | ROI ≥ ${config.minRoi}% | AV ≥ $${config.minAccountValue}`);
  console.log(`  Top Traders:  ${config.topTraders}`);
  console.log(`  Cache TTL:    ${config.cacheTtlSec}s\n`);

  // Start the web dashboard + API
  startServer();

  // Initial poll
  console.log(`  Starting initial discovery...`);
  try {
    await pollCycle();
  } catch (err) {
    console.error(`  ⚠ Initial poll failed:`, err instanceof Error ? err.message : err);
  }

  // Autonomous polling loop
  setInterval(async () => {
    try {
      await pollCycle();
    } catch (err) {
      console.error(`  ⚠ Poll failed:`, err instanceof Error ? err.message : err);
    }
  }, config.pollIntervalSec * 1000);
}

main().catch(console.error);
