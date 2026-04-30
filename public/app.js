/**
 * NansenHyperliquid — Frontend Dashboard
 */

const REFRESH_INTERVAL = 30_000; // 30s

// ── SVG Icons (replace all emoji) ──

const ICONS = {
  bolt: `<svg width="40" height="40" viewBox="0 0 52 52" fill="none"><defs><linearGradient id="eg" x1="0" y1="0" x2="52" y2="52"><stop offset="0%" stop-color="#50d2c1"/><stop offset="100%" stop-color="#1fa67d"/></linearGradient></defs><path d="M30 4L12 28h12L20 48l20-26H28L34 4h-4z" fill="url(#eg)" opacity="0.7"/></svg>`,
  bell: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  arrowUp: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`,
  arrowDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>`,
  xCircle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`,
  chart: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>`,
};

const ALERT_ICONS = {
  new_position: `<div class="alert-item__icon alert-item__icon--open">${ICONS.arrowUp}</div>`,
  position_closed: `<div class="alert-item__icon alert-item__icon--close">${ICONS.arrowDown}</div>`,
  position_changed: `<div class="alert-item__icon alert-item__icon--change">${ICONS.refresh}</div>`,
  new_trade: `<div class="alert-item__icon alert-item__icon--trade">${ICONS.chart}</div>`,
};

// ── Formatters ──

function fmtUsd(v) {
  if (!v && v !== 0) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function fmtPnl(v) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${fmtUsd(v)}`;
}

function fmtPct(v) {
  if (!v && v !== 0) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function fmtAddr(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(iso) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

// ── Tab Switching ──

let activeTab = "traders";

document.getElementById("tabTraders").addEventListener("click", () => switchTab("traders"));
document.getElementById("tabAlerts").addEventListener("click", () => switchTab("alerts"));

function switchTab(tab) {
  activeTab = tab;
  document.getElementById("tradersView").style.display = tab === "traders" ? "" : "none";
  document.getElementById("alertsView").style.display = tab === "alerts" ? "" : "none";
  document.querySelectorAll(".tab").forEach((el) => {
    el.classList.toggle("tab--active", el.dataset.tab === tab);
  });
}

// ── Rendering ──

function renderTraderCard(trader, rank) {
  if (trader.error) {
    return `
    <div class="trader-card">
      <div class="trader-card__header">
        <div><div class="trader-card__rank">#${rank}</div></div>
      </div>
      <div class="error-msg">${trader.error}</div>
    </div>`;
  }

  const positionsHtml = (trader.positions || [])
    .slice(0, 5)
    .map((p) => {
      const side = p.size > 0 ? "long" : "short";
      const sideIcon = p.size > 0 ? ICONS.arrowUp : ICONS.arrowDown;
      const pnlClass = p.unrealized_pnl_usd >= 0 ? "metric-box__value--green" : "metric-box__value--red";
      return `
      <div class="position">
        <span class="position__side position__side--${side}">${sideIcon} ${side}</span>
        <span class="position__symbol">${p.token_symbol}</span>
        <span class="position__value">${fmtUsd(p.position_value_usd)} · ${p.leverage_value}x</span>
        <span class="position__pnl ${pnlClass}">${fmtPnl(p.unrealized_pnl_usd)}</span>
      </div>`;
    })
    .join("");

  return `
  <div class="trader-card">
    <div class="trader-card__header">
      <div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="trader-card__rank">#${rank}</div>
          ${trader.label ? `<span class="trader-card__label">${trader.label}</span>` : ""}
        </div>
        <div class="trader-card__address">${fmtAddr(trader.address)}</div>
      </div>
    </div>

    <div class="metrics-row">
      <div class="metric-box">
        <div class="metric-box__label">Total PnL</div>
        <div class="metric-box__value ${trader.totalPnl >= 0 ? "metric-box__value--green" : "metric-box__value--red"}">${fmtPnl(trader.totalPnl)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-box__label">ROI</div>
        <div class="metric-box__value ${trader.roi >= 0 ? "metric-box__value--green" : "metric-box__value--red"}">${fmtPct(trader.roi)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-box__label">Account</div>
        <div class="metric-box__value">${fmtUsd(trader.accountValue)}</div>
      </div>
    </div>

    ${
      positionsHtml
        ? `<div class="positions">
            <div class="positions__title">Open Positions (${trader.positions.length})</div>
            ${positionsHtml}
          </div>`
        : `<div style="font-size:0.75rem;color:var(--text-muted)">No open positions</div>`
    }
  </div>`;
}

function renderAlertItem(alert) {
  const iconHtml = ALERT_ICONS[alert.type] || ALERT_ICONS.new_trade;

  return `
  <div class="alert-item">
    ${iconHtml}
    <div class="alert-item__body">
      <div class="alert-item__header">
        <span class="alert-item__title">${alert.action} ${alert.symbol} ${alert.side}</span>
        <span class="alert-item__time">${timeAgo(alert.timestamp)}</span>
      </div>
      <div class="alert-item__detail">${fmtUsd(alert.valueUsd)} · ${alert.details}</div>
      <div class="alert-item__trader">${alert.traderLabel || fmtAddr(alert.traderAddress)}</div>
    </div>
  </div>`;
}

function renderDashboard(data) {
  const { state } = data;

  // Stats bar
  const dot = document.getElementById("daemonDot");
  dot.className = `stat__dot ${state.pollCount > 0 ? "" : "stat__dot--off"}`;
  document.getElementById("daemonStatus").textContent =
    state.pollCount > 0 ? `Poll #${state.pollCount} · ${timeAgo(state.lastPollAt)}` : "Waiting...";
  document.getElementById("traderCount").textContent = state.traders.length;
  document.getElementById("positionCount").textContent = state.traders.reduce(
    (s, t) => s + (t.positions?.length || 0), 0
  );
  document.getElementById("alertCount").textContent = state.alerts.length;

  // Traders
  const tradersEl = document.getElementById("tradersView");
  if (state.traders.length === 0) {
    tradersEl.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state__icon">${ICONS.bolt}</div>
        <div>No traders discovered yet.<br>Daemon will poll automatically, or set NANSEN_API_KEY and restart.</div>
      </div>`;
  } else {
    tradersEl.innerHTML = state.traders.map((t, i) => renderTraderCard(t, i + 1)).join("");
  }

  // Alerts
  const alertsEl = document.getElementById("alertsView");
  if (state.alerts.length === 0) {
    alertsEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">${ICONS.bell}</div>
        <div>No alerts yet. Alerts appear when traders open/close positions.</div>
      </div>`;
  } else {
    alertsEl.innerHTML = state.alerts.slice(0, 50).map(renderAlertItem).join("");
  }
}

// ── Fetching ──

async function fetchDashboard() {
  try {
    const res = await fetch("/api/dashboard");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderDashboard(data);
  } catch (err) {
    document.getElementById("daemonStatus").textContent = `Error: ${err.message}`;
  }
}

// ── Init ──
fetchDashboard();
setInterval(fetchDashboard, REFRESH_INTERVAL);
