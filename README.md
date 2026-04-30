# ⚡ NansenHyperliquid

**Autonomous Hyperliquid perpetual copytrading daemon** — discover and track top traders via the Nansen API.

Built as a real-time monitoring system that continuously polls the Nansen Hyperliquid endpoints to identify profitable perp traders, track their open positions, and surface actionable trade alerts.

## Architecture

```
┌─ DISCOVERY ────────────────────────────────┐
│  Find top Smart Money traders (Leaderboard)│
└────────────────────┬───────────────────────┘
                     │
   ┌─────────────────┴─────────────────┐
   │                                   │
   ▼ Every 5 min                       ▼ Every 5 min
┌───────────────────────┐  ┌────────────────────────┐
│ Fetch recent trades   │  │ Check current positions │
│ Detect Open/Close     │  │ Diff vs previous state  │
│ Generate alerts       │  │ Surface PnL changes     │
└───────────────────────┘  └────────────────────────┘
```

## Nansen API Endpoints Used

| Endpoint | Path | Purpose |
|----------|------|---------|
| Perp Leaderboard | `POST /api/v1/perp-leaderboard` | Discover top traders by PnL/ROI |
| Perp Positions | `POST /api/v1/profiler/perp-positions` | Monitor open positions |
| Perp Trades | `POST /api/v1/profiler/perp-trades` | Track trade activity |

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Add your NANSEN_API_KEY

# 3. Run daemon (autonomous polling + dashboard)
npm run daemon

# 4. Or just the dashboard (dev mode)
npm run dev
```

**Dashboard**: http://localhost:3001  
**API**: http://localhost:3001/api/dashboard

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard` | Full daemon state for frontend |
| `GET` | `/api/traders` | All tracked traders |
| `GET` | `/api/traders/:address` | Single trader detail |
| `GET` | `/api/alerts` | Recent trade alerts |
| `GET` | `/api/leaderboard` | Trigger leaderboard discovery |
| `POST` | `/api/poll` | Trigger manual poll cycle |

## Configuration

All settings via `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `NANSEN_API_KEY` | — | Required. Your Nansen API key |
| `PORT` | 3001 | Dashboard port |
| `POLL_INTERVAL` | 300 | Polling interval (seconds) |
| `MIN_PNL` | 10000 | Minimum PnL filter (USD) |
| `MIN_ROI` | 20 | Minimum ROI filter (%) |
| `MIN_ACCOUNT_VALUE` | 50000 | Minimum account value (USD) |
| `TOP_TRADERS` | 20 | Number of traders to track |
| `CACHE_TTL` | 120 | Cache TTL (seconds) |

## Dashboard Features

- **Trader Cards**: Ranked grid showing PnL, ROI, account value, and open positions
- **Position Badges**: Long/Short indicators with leverage, entry price, and unrealized PnL
- **Alert Feed**: Real-time notifications when traders open/close positions
- **Auto-refresh**: Dashboard updates every 30 seconds
- **Dark mode**: Neon violet/cyan terminal aesthetic

## Tests

```bash
npm test          # 20 tests
npm run ci        # typecheck + lint + coverage
```

## Tech Stack

- **Runtime**: Node.js 20+ / TypeScript 5.9
- **Server**: Express 5
- **Frontend**: Vanilla JS/CSS (glassmorphism dark mode)
- **Testing**: Node test runner + c8

## Related Projects

- [NansenNexusMCP](https://github.com/edycutjong/NansenNexusMCP) — Full Nansen MCP server
- [NansenCEXHealth](../NansenCEXHealth) — CEX balance & flow monitoring

---

Built by [@edycutjong](https://github.com/edycutjong) · Powered by [Nansen API](https://nansen.ai)
