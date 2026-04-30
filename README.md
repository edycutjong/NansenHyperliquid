# ⚡ NansenHyperliquid

> **Autonomous Hyperliquid perpetual copytrading daemon** — discover top Smart Money perp traders, monitor their positions in real-time, and surface actionable trade alerts via the Nansen API.

[![Status](https://img.shields.io/badge/status-stable-brightgreen)](https://github.com/edycutjong/NansenHyperliquid)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node 20](https://img.shields.io/badge/node-20+-brightgreen?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Tests](https://img.shields.io/badge/tests-20%2F20-success)](tests/)
[![Nansen API](https://img.shields.io/badge/Nansen%20API-3%20endpoints-FF6B35)](https://docs.nansen.ai/)

---

## 🔑 Why This Exists

Hyperliquid is the largest on-chain perpetual exchange ($4B+ daily volume), but tracking what Smart Money traders are actually doing requires:

1. **Constantly polling** the leaderboard to find who's profitable
2. **Cross-referencing** their positions across multiple tokens
3. **Detecting changes** — did they just open a 50x ETH Long?
4. **Acting fast** — by the time you check manually, the move is over

**NansenHyperliquid solves this as an always-on daemon:**

| Problem | Manual Approach | NansenHyperliquid |
|---------|----------------|-------------------|
| Find top traders | Browse Nansen dashboard hourly | Autonomous leaderboard discovery every 10 min |
| Track positions | Check each wallet individually | Parallel batch monitoring for 20+ traders |
| Detect changes | Compare screenshots | Diff-based alert engine (open/close/change) |
| Latency | Minutes to hours | ≤ 5 min polling cycles |
| History | None | 200-event rolling alert log |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                    DAEMON LOOP (5 min)                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│   ┌──────────────────┐                                 │
│   │  1. DISCOVERY     │  POST /api/v1/perp-leaderboard │
│   │  Find top traders │  → Filter by PnL, ROI, AV     │
│   └────────┬─────────┘                                 │
│            │                                           │
│   ┌────────▼─────────┐                                 │
│   │  2. POSITIONS     │  POST /profiler/perp-positions │
│   │  Fetch per trader │  → Parallel batches of 5      │
│   └────────┬─────────┘                                 │
│            │                                           │
│   ┌────────▼─────────┐                                 │
│   │  3. TRADES        │  POST /profiler/perp-trades    │
│   │  24hr activity    │  → Min $5K value filter       │
│   └────────┬─────────┘                                 │
│            │                                           │
│   ┌────────▼─────────┐                                 │
│   │  4. DIFF ENGINE   │  oldPositions ⊖ newPositions   │
│   │  Generate alerts  │  → new_position, closed, trade │
│   └────────┬─────────┘                                 │
│            │                                           │
│   ┌────────▼─────────┐     ┌──────────────────────┐   │
│   │  5. STATE STORE   │────▶│  REST API (Express 5) │   │
│   │  In-memory cache  │     │  GET /api/dashboard   │   │
│   └──────────────────┘     └──────────┬───────────┘   │
│                                       │               │
└───────────────────────────────────────┼───────────────┘
                                        │
                               ┌────────▼────────┐
                               │  DASHBOARD UI    │
                               │  Dark glassmorp. │
                               │  Auto-refresh 30s│
                               └─────────────────┘
```

---

## 📡 Nansen API Endpoints Used

Three Hyperliquid-specific endpoints from the [Nansen API](https://docs.nansen.ai/):

| Endpoint | Method | Path | Purpose |
|----------|--------|------|---------|
| **Perp Leaderboard** | `POST` | `/api/v1/perp-leaderboard` | Discover top traders ranked by PnL/ROI over custom date ranges |
| **Perp Positions** | `POST` | `/api/v1/profiler/perp-positions` | Current open positions for a specific trader address |
| **Perp Trades** | `POST` | `/api/v1/profiler/perp-trades` | Historical trade activity with side, action, price, PnL |

### Request Examples

<details>
<summary><code>perp-leaderboard</code> — Discover Top Traders</summary>

```json
{
  "date": { "from": "2026-03-30", "to": "2026-04-30" },
  "filters": {
    "total_pnl": { "min": 10000 },
    "roi": { "min": 20 },
    "account_value": { "min": 50000 },
    "include_smart_money_labels": ["Fund", "Smart Trader"]
  },
  "pagination": { "page": 1, "per_page": 20 },
  "order_by": [{ "field": "total_pnl", "direction": "DESC" }]
}
```

</details>

<details>
<summary><code>profiler/perp-positions</code> — Open Positions</summary>

```json
{
  "address": "0x1234...abcd",
  "order_by": [{ "field": "position_value_usd", "direction": "DESC" }]
}
```

**Response fields:** `token_symbol`, `size`, `position_value_usd`, `unrealized_pnl_usd`, `leverage_value`, `entry_price_usd`, `mark_price_usd`, `liquidation_price_usd`

</details>

<details>
<summary><code>profiler/perp-trades</code> — Trade History</summary>

```json
{
  "address": "0x1234...abcd",
  "date": { "from": "2026-04-29T00:00:00Z", "to": "2026-04-30T00:00:00Z" },
  "filters": { "value_usd": { "min": 5000 } },
  "pagination": { "page": 1, "per_page": 100 },
  "order_by": [{ "field": "timestamp", "direction": "DESC" }]
}
```

**Response fields:** `timestamp`, `token_symbol`, `side` (Long/Short), `action` (Open/Add/Close/Reduce), `price`, `size`, `value_usd`, `closed_pnl`

</details>

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/edycutjong/NansenHyperliquid
cd NansenHyperliquid
npm install

# 2. Configure
cp .env.example .env
# ⚠️ Add your NANSEN_API_KEY

# 3. Run as daemon (autonomous polling + dashboard)
npm run daemon

# 4. Or dashboard only (dev mode)
npm run dev
```

**Dashboard:** http://localhost:3001
**Health check:** http://localhost:3001/api/dashboard

### What Happens on Boot

```
  ⚡ NansenHyperliquid Daemon
  ──────────────────────────
  Mode:         Autonomous Copytrade Tracker
  Poll:         Every 300s
  Filters:      PnL ≥ $10000 | ROI ≥ 20% | AV ≥ $50000
  Top Traders:  20
  Cache TTL:    120s

  Starting initial discovery...
  [Poll #1] 20 traders | 47 positions | 12 alerts | 3.2s
```

---

## 🖥️ Dashboard

Premium dark-mode glassmorphic interface with real-time data visualization:

### Trader Cards (Traders Tab)

Each tracked trader gets a ranked card showing:
- **Rank + Label** — Nansen-labeled Smart Money identity
- **PnL / ROI / Account Value** — Key performance metrics
- **Position Badges** — Long 🟢 / Short 🔴 indicators with leverage, entry price, unrealized PnL
- **Address** — Truncated with full tooltip on hover

### Alert Feed (Alerts Tab)

Real-time chronological feed of position changes:
- 🟢 `new_position` — Trader opened a new position
- 🔴 `position_closed` — Position was fully closed
- 🟡 `new_trade` — Significant trade detected ($5K+ value)
- Each alert includes: trader, symbol, side, leverage, price, and PnL details

### Status Bar

Always-visible daemon telemetry: connection status indicator, trader count, total positions, total alerts.

---

## 🔌 REST API

The daemon exposes a complete REST API for programmatic access:

| Method | Path | Description | Example Response |
|--------|------|-------------|-----------------|
| `GET` | `/api/dashboard` | Full daemon state + config | `{ state, config, cacheHit }` |
| `GET` | `/api/traders` | All tracked traders | `{ traders: [...], count, lastPollAt }` |
| `GET` | `/api/traders/:address` | Single trader with positions & trades | `{ address, totalPnl, positions, recentTrades }` |
| `GET` | `/api/alerts` | Recent trade alerts (max 200) | `{ alerts: [...], total }` |
| `GET` | `/api/leaderboard` | Trigger leaderboard discovery | `{ traders: [...], count }` |
| `POST` | `/api/poll` | Force immediate poll cycle | `{ message, pollCount, traders }` |

### Example: Fetch latest alerts

```bash
curl http://localhost:3001/api/alerts?limit=10 | jq
```

```json
{
  "alerts": [
    {
      "timestamp": "2026-04-30T02:45:00.000Z",
      "traderAddress": "0x1a2b...3c4d",
      "traderLabel": "Token Millionaire",
      "type": "new_position",
      "symbol": "ETH",
      "side": "Long",
      "action": "Open",
      "valueUsd": 250000,
      "details": "25x leverage, entry $1892.50"
    }
  ],
  "total": 47
}
```

---

## ⚙️ Configuration

All settings via `.env` (see [.env.example](.env.example)):

| Variable | Default | Description |
|----------|---------|-------------|
| `NANSEN_API_KEY` | — | **Required.** Your Nansen API key |
| `PORT` | `3001` | Dashboard & API port |
| `POLL_INTERVAL` | `300` | Autonomous polling interval (seconds) |
| `MIN_PNL` | `10000` | Minimum total PnL to qualify ($USD) |
| `MIN_ROI` | `20` | Minimum ROI to qualify (%) |
| `MIN_ACCOUNT_VALUE` | `50000` | Minimum account value ($USD) |
| `TOP_TRADERS` | `20` | Number of traders to track from leaderboard |
| `CACHE_TTL` | `120` | In-memory cache TTL (seconds) |

### Tuning for Different Strategies

```bash
# Whale hunting — large accounts, high PnL
MIN_PNL=100000 MIN_ACCOUNT_VALUE=500000 TOP_TRADERS=10

# Degen alpha — cast a wider net
MIN_PNL=1000 MIN_ROI=50 MIN_ACCOUNT_VALUE=5000 TOP_TRADERS=50

# Conservative monitoring — slow polling
POLL_INTERVAL=900 CACHE_TTL=300
```

---

## 🧠 Core Logic: The Diff Engine

The alert system works by comparing position snapshots across poll cycles:

```
Poll N:    Trader A holds [ETH Long, BTC Short]
Poll N+1:  Trader A holds [ETH Long, SOL Long]
                                    ↓
Alerts generated:
  🔴 BTC Short closed  (was in N, gone in N+1)
  🟢 SOL Long opened   (absent in N, present in N+1)
```

**Implementation:** [`src/services/tracker.ts`](src/services/tracker.ts) — the `diffPositions()` function compares `Set<symbol>` between old and new state, producing typed `TradeAlert` objects with full metadata.

### Rate Limit Strategy

- **Batched parallel requests:** Traders are updated in groups of 5 to avoid API rate limits
- **TTL cache:** All API responses are cached (default 120s) to prevent redundant calls
- **Leaderboard cache:** Discovery results cached for 10 minutes — trader list doesn't change frequently
- **Graceful degradation:** Trade endpoint failures don't crash the poll cycle

---

## 📂 Project Structure

```
NansenHyperliquid/
├── src/
│   ├── api/
│   │   ├── nansen.ts           # HTTP client — 3 Nansen endpoints
│   │   └── types.ts            # TypeScript interfaces (12 types)
│   ├── routes/
│   │   └── api.ts              # Express router — 6 REST endpoints
│   ├── services/
│   │   ├── tracker.ts          # Core daemon logic + diff engine
│   │   ├── cache.ts            # In-memory TTL cache
│   │   └── config.ts           # Environment config loader
│   ├── daemon.ts               # Autonomous polling entry point
│   ├── server.ts               # Express 5 bootstrap
│   └── index.ts                # Dashboard-only entry point
├── public/
│   ├── index.html              # Dark glassmorphic dashboard
│   ├── styles.css              # Neon violet/cyan design tokens
│   └── app.js                  # Frontend rendering + auto-refresh
├── tests/
│   ├── cache.test.ts           # Cache TTL + eviction tests
│   ├── config.test.ts          # Config defaults + env parsing
│   ├── tracker.test.ts         # Diff engine + alert generation
│   └── types.test.ts           # Type guard + interface tests
├── .env.example                # Environment template
├── package.json                # Express 5 + TypeScript 5.9
├── tsconfig.json               # Strict mode + ESM output
└── eslint.config.mjs           # Flat config + TypeScript rules
```

---

## 🧪 Development

```bash
# Type-check
npm run typecheck

# Run all tests (20/20)
npm test

# Run with coverage
npm run test:coverage

# Lint
npm run lint

# Full CI pipeline
npm run ci     # typecheck → lint → test:coverage
```

### Test Coverage

| Test File | Tests | Coverage Area |
|-----------|-------|---------------|
| `cache.test.ts` | 5 | TTL expiry, get/set, eviction |
| `config.test.ts` | 5 | Default values, env override, validation |
| `tracker.test.ts` | 5 | Discovery, updates, diffing, alerts, poll cycle |
| `types.test.ts` | 5 | Interface contracts, type guards, serialization |
| **Total** | **20** | |

---

## 🏆 Challenge Context

This project is the **6th build** in a progressive arc across the [Nansen CLI Build Challenge](https://academy.nansen.ai/en/help/articles/6399546-nansen-cli-builds) (March–April 2026):

| Week | Project | Result | What It Proved |
|------|---------|--------|----------------|
| 1 | [Make Alpha](https://github.com/edycutjong/nansen-make-alpha) | Unplaced | Zero-dep data compilation |
| 2 | [NansenTerm](https://github.com/edycutjong/nansen-term) | **🥈 2nd Place** | Interactive TUI + live streaming |
| 3 | [Polymarket Oracle](https://github.com/edycutjong/nansen-polymarket-oracle) | Submitted | Predictive SM divergence scoring |
| 4 | [Project RedString](https://github.com/edycutjong/NansenRedString) | Submitted | Forensic 3D graph visualization |
| 5 | [Nansen Nexus MCP](https://github.com/edycutjong/NansenNexusMCP) | **Capstone** | Enterprise MCP infrastructure |
| **6** | **NansenHyperliquid** | **Live Daemon** | **Autonomous perp monitoring** |

### Ecosystem Stats

| Metric | Value |
|--------|-------|
| Projects shipped | **6** |
| Total tests | **718+** |
| Nansen API endpoints used | **53+** |
| Total TypeScript LOC | **~26,000+** |
| Best placement | **🥈 2nd Place (Week 2)** |
| Prize won | **100,000 Nansen API Credits** |

---

## 🔗 Related Projects

| Project | Description | Nansen Endpoints |
|---------|-------------|-----------------|
| [NansenNexusMCP](https://github.com/edycutjong/NansenNexusMCP) | Compound skills MCP server for AI agents | 50+ CLI endpoints |
| [NansenCEXHealth](../NansenCEXHealth) | CEX balance & flow monitoring daemon | `current-balance`, `counterparties` |
| [NansenRedString](https://github.com/edycutjong/NansenRedString) | 3D wallet forensics graph | `related-addresses`, `counterparties` |
| [nansen-polymarket-oracle](https://github.com/edycutjong/nansen-polymarket-oracle) | SM × Polymarket divergence | 12 prediction-market endpoints |
| [nansen-term](https://github.com/edycutjong/nansen-term) | Bloomberg-style TUI | Smart Money, profiler |
| [nansen-make-alpha](https://github.com/edycutjong/nansen-make-alpha) | Zero-dep Makefile compiler | Core research endpoints |

---

## 📄 License

MIT — Built by [@edycutjong](https://github.com/edycutjong) · Powered by [Nansen API](https://nansen.ai) · Hyperliquid Perp Data
