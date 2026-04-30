/**
 * NansenHyperliquid — Frontend Dashboard
 */

const REFRESH_INTERVAL = 30_000; // 30s

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
      const pnlClass = p.unrealized_pnl_usd >= 0 ? "metric-box__value--green" : "metric-box__value--red";
      return `
      <div class="position">
        <span class="position__side position__side--${side}">${side}</span>
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
  const icons = {
    new_position: "🟢",
    position_closed: "🔴",
    position_changed: "🔄",
    new_trade: "📊",
  };

  return `
  <div class="alert-item">
    <div class="alert-item__icon">${icons[alert.type] || "📋"}</div>
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
        <div class="empty-state__icon">⚡</div>
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
        <div class="empty-state__icon">🔔</div>
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
