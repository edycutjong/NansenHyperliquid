/**
 * Standalone server entry (non-daemon mode)
 * For development or when you only want the web dashboard.
 */

import "dotenv/config";
import { startServer } from "./server.js";

console.log(`\n  ⚡ NansenHyperliquid Dashboard (Server Mode)`);
console.log(`  ─────────────────────────────────────────────\n`);

startServer();
