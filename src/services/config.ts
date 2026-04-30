/**
 * Daemon configuration — loaded from environment
 */

import type { DaemonConfig } from "../api/types.js";

export function loadConfig(): DaemonConfig {
  return {
    pollIntervalSec: parseInt(process.env.POLL_INTERVAL || "300", 10),
    minPnl: parseInt(process.env.MIN_PNL || "10000", 10),
    minRoi: parseInt(process.env.MIN_ROI || "20", 10),
    minAccountValue: parseInt(process.env.MIN_ACCOUNT_VALUE || "50000", 10),
    topTraders: parseInt(process.env.TOP_TRADERS || "20", 10),
    cacheTtlSec: parseInt(process.env.CACHE_TTL || "120", 10),
  };
}
