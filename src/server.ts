/**
 * Express server — serves dashboard + API
 *
 * Used by both the daemon and standalone server modes.
 */

import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import path from "node:path";
import apiRoutes from "./routes/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startServer(): void {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3001", 10);

  app.use(cors());
  app.use(express.json());

  // API routes
  app.use("/api", apiRoutes);

  // Serve static frontend
  const publicDir = path.resolve(__dirname, "..", "public");
  app.use(express.static(publicDir));

  // SPA fallback (Express 5 wildcard syntax)
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  app.listen(PORT, () => {
    console.log(`  Dashboard:    http://localhost:${PORT}`);
    console.log(`  API:          http://localhost:${PORT}/api/dashboard\n`);
  });
}
