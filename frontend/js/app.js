/**
 * NEXUS Investment Suite — Core Application Module
 * Handles: tab switching, WebSocket management, global state, utilities, toasts.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Global State
// ─────────────────────────────────────────────────────────────────────────────

const NEXUS = {
  /** Active tab id: 'elara' | 'altair' | 'portfolio' */
  activeTab: 'elara',

  /** WebSocket connections, keyed by session_id */
  sockets: {},

  /** Last known portfolio positions array */
  portfolioPositions: [],

  /** Base API URL */
  apiBase: '',  // Same origin

  /** WS base URL */
  wsBase: `ws://${window.location.host}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab Navigation
// ─────────────────────────────────────────────────────────────────────────────

function initTabs() {
  const nav = document.getElementById('tabNav');
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const tabId = btn.dataset.tab;
    switchTab(tabId);
  });

  // Check URL param for pre-selected tab
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam) switchTab(tabParam);
}

function switchTab(tabId) {
  const panels = document.querySelectorAll('.tab-panel');
  const btns   = document.querySelectorAll('.tab-btn');

  panels.forEach(p => p.classList.remove('active'));
  btns.forEach(b => b.classList.remove('active'));

  const targetPanel = document.getElementById(`panel${capitalize(tabId)}`);
  const targetBtn   = document.getElementById(`tab${capitalize(tabId)}`);

  if (targetPanel) targetPanel.classList.add('active');
  if (targetBtn)   targetBtn.classList.add('active');

  NEXUS.activeTab = tabId;

  // Notify modules
  if (tabId === 'portfolio') {
    if (typeof portfolioModule !== 'undefined') portfolioModule.onTabActivate();
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a WebSocket connection for a given session_id.
 * Returns an object with { onMessage, close }.
 *
 * @param {string} sessionId
 * @param {function(data: object): void} onMessage - called with parsed JSON message
 * @returns {{ ws: WebSocket, close: function }}
 */
function createProgressSocket(sessionId, onMessage) {
  const url = `${NEXUS.wsBase}/ws/${sessionId}`;
  const ws  = new WebSocket(url);

  ws.onopen = () => {
    console.debug(`[WS] Connected: ${sessionId}`);
    // Heartbeat every 20s
    ws._pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping');
    }, 20_000);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data !== 'pong' && onMessage) onMessage(data);
    } catch (err) {
      console.warn('[WS] Could not parse message:', event.data);
    }
  };

  ws.onerror = (err) => {
    console.warn('[WS] Error:', err);
  };

  ws.onclose = () => {
    clearInterval(ws._pingInterval);
    console.debug(`[WS] Closed: ${sessionId}`);
  };

  NEXUS.sockets[sessionId] = ws;

  return {
    ws,
    close() {
      clearInterval(ws._pingInterval);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      delete NEXUS.sockets[sessionId];
    },
  };
}

/**
 * Wait for a WebSocket to be fully open.
 */
function waitForSocketOpen(ws, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    const t = setTimeout(() => reject(new Error('WS open timeout')), timeout);
    ws.addEventListener('open', () => { clearTimeout(t); resolve(); }, { once: true });
    ws.addEventListener('error', () => { clearTimeout(t); reject(new Error('WS error')); }, { once: true });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function apiPost(path, body, signal) {
  const resp = await fetch(`${NEXUS.apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

async function apiGet(path) {
  const resp = await fetch(`${NEXUS.apiBase}${path}`);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

async function apiPut(path, body) {
  const resp = await fetch(`${NEXUS.apiBase}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

async function apiDelete(path) {
  const resp = await fetch(`${NEXUS.apiBase}${path}`, { method: 'DELETE' });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// UUID Generator
// ─────────────────────────────────────────────────────────────────────────────

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Polyfill
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Number / Date Formatters
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(value, decimals = 2, currency = '') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const abs = Math.abs(value);
  let formatted;
  if (abs >= 1_000_000_000) {
    formatted = (value / 1_000_000_000).toFixed(2) + 'B';
  } else if (abs >= 1_000_000) {
    formatted = (value / 1_000_000).toFixed(2) + 'M';
  } else if (abs >= 1_000) {
    formatted = value.toLocaleString('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } else {
    formatted = value.toFixed(decimals);
  }
  return currency ? `${currency} ${formatted}` : formatted;
}

function formatPct(value, showSign = true) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown → HTML (minimal renderer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a subset of Markdown to HTML.
 * Handles: headings, bold, italic, code, tables, lists, blockquotes, horizontal rules.
 */
function renderMarkdown(md) {
  if (!md) return '';

  let html = md;

  // Escape HTML (except we want to keep special chars in tables etc.)
  // We'll process line by line

  const lines = html.split('\n');
  const result = [];
  let inTable    = false;
  let tableRows  = [];
  let inList     = false;
  let listItems  = [];
  let inListType = null; // 'ul' | 'ol'
  let inPre      = false;
  let preLines   = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    let t = '<table>';
    tableRows.forEach((row, idx) => {
      const isHeader = idx === 0;
      const isSep = /^[\s|:-]+$/.test(row.replace(/\|/g, ''));
      if (isSep) return;
      const tag = isHeader ? 'th' : 'td';
      const cells = row.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
      t += `<tr>${cells.map(c => `<${tag}>${inlineMarkdown(c)}</${tag}>`).join('')}</tr>`;
    });
    t += '</table>';
    result.push(t);
    tableRows = [];
    inTable = false;
  }

  function flushList() {
    if (listItems.length === 0) return;
    const tag = inListType;
    result.push(`<${tag}>${listItems.map(li => `<li>${inlineMarkdown(li)}</li>`).join('')}</${tag}>`);
    listItems = [];
    inList = false;
    inListType = null;
  }

  function flushPre() {
    if (preLines.length === 0) return;
    const content = escapeHtml(preLines.join('\n'));
    result.push(`<pre>${content}</pre>`);
    preLines = [];
    inPre = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      if (inPre) {
        flushPre();
      } else {
        flushTable();
        flushList();
        inPre = true;
      }
      continue;
    }
    if (inPre) {
      preLines.push(line);
      continue;
    }

    // Table row
    if (line.includes('|') && line.trim().startsWith('|')) {
      flushList();
      inTable = true;
      tableRows.push(line.trim());
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushList();
      result.push('<hr>');
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      result.push(`<h${level}>${inlineMarkdown(hMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      flushList();
      result.push(`<blockquote>${inlineMarkdown(line.slice(1).trim())}</blockquote>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*+]\s+(.+)/);
    if (ulMatch) {
      if (inList && inListType !== 'ul') flushList();
      inList = true;
      inListType = 'ul';
      listItems.push(ulMatch[1]);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (inList && inListType !== 'ol') flushList();
      inList = true;
      inListType = 'ol';
      listItems.push(olMatch[1]);
      continue;
    }

    // Empty line flushes lists
    if (line.trim() === '') {
      flushList();
      result.push('');
      continue;
    }

    // Normal paragraph / text
    flushList();

    // Check for ASCII art dashboard box (┌─)
    if (line.startsWith('┌') || line.startsWith('│') || line.startsWith('├') || line.startsWith('└')) {
      // Collect the box
      const boxLines = [line];
      while (i + 1 < lines.length && (
        lines[i + 1].startsWith('┌') ||
        lines[i + 1].startsWith('│') ||
        lines[i + 1].startsWith('├') ||
        lines[i + 1].startsWith('└') ||
        lines[i + 1].startsWith('─')
      )) {
        i++;
        boxLines.push(lines[i]);
      }
      result.push(`<pre class="dashboard-box">${escapeHtml(boxLines.join('\n'))}</pre>`);
      continue;
    }

    result.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  flushTable();
  flushList();
  flushPre();

  return result.join('\n');
}

function inlineMarkdown(text) {
  if (!text) return '';
  let t = text;
  // Bold
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
  t = t.replace(/_(.+?)_/g, '<em>$1</em>');
  // Inline code
  t = t.replace(/`(.+?)`/g, '<code>$1</code>');
  // Links
  t = t.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return t;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast Notifications
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration - milliseconds
 */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const toast     = document.createElement('div');
  const icons     = { success: '✓', error: '✕', warning: '⚠', info: '◈' };

  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '◈'}</span><span>${message}</span>`;
  container.appendChild(toast);

  const remove = () => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 200);
  };

  setTimeout(remove, duration);
  toast.addEventListener('click', remove);
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Indicator (health check)
// ─────────────────────────────────────────────────────────────────────────────

async function checkHealth() {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');

  try {
    const status = await apiGet('/api/status');
    if (status.ollama && status.tavily) {
      dot.className    = 'status-dot connected';
      text.textContent = `Ollama (${status.model || 'lokal'}) · Tavily OK`;
    } else if (status.ollama && !status.tavily) {
      dot.className    = 'status-dot warning';
      text.textContent = 'Tavily API-Key fehlt';
    } else if (!status.ollama && status.tavily) {
      dot.className    = 'status-dot warning';
      text.textContent = 'Ollama offline — bitte starten';
    } else {
      dot.className    = 'status-dot warning';
      text.textContent = 'Ollama offline · Tavily fehlt';
    }
  } catch {
    dot.className    = 'status-dot error';
    text.textContent = 'Backend offline';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Clock
// ─────────────────────────────────────────────────────────────────────────────

function startClock() {
  const el = document.getElementById('headerTime');
  function tick() {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('de-DE', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  tick();
  setInterval(tick, 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-fill Altair tab
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Navigate to Altair tab with a pre-filled ticker.
 * Called from Elara and Portfolio modules.
 */
function openAltairWithTicker(ticker) {
  document.getElementById('altairTicker').value = ticker.toUpperCase();
  switchTab('altair');
  // Scroll form into view
  document.getElementById('altairFormCard').scrollIntoView({ behavior: 'smooth' });
}

// ─────────────────────────────────────────────────────────────────────────────
// URL Param support for Altair pre-fill
// ─────────────────────────────────────────────────────────────────────────────

function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const ticker = params.get('ticker');
  if (ticker) {
    openAltairWithTicker(ticker);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Timer Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start a running timer that updates an element's text content.
 * Returns a stop function.
 */
function startTimer(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return () => {};
  const start = Date.now();
  const interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    el.textContent = formatElapsed(elapsed);
  }, 1000);
  return () => clearInterval(interval);
}

/**
 * Animate a progress bar element with a capped fill based on elapsed vs max.
 */
function startProgressAnimation(barId, maxSeconds = 300) {
  const bar = document.getElementById(barId);
  if (!bar) return () => {};
  bar.style.animation = 'none';

  const start    = Date.now();
  const interval = setInterval(() => {
    const elapsed = (Date.now() - start) / 1000;
    const pct     = Math.min((elapsed / maxSeconds) * 100, 95);
    bar.style.width    = `${pct}%`;
    bar.style.animation = 'none';
  }, 1000);
  return () => clearInterval(interval);
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart.js defaults (Bloomberg terminal theme)
// ─────────────────────────────────────────────────────────────────────────────

function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#7080a0';
  Chart.defaults.borderColor = '#1e2040';
  Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  Chart.defaults.font.size   = 11;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = '#0d0d1f';
  Chart.defaults.plugins.tooltip.borderColor     = '#2a2d5a';
  Chart.defaults.plugins.tooltip.borderWidth     = 1;
  Chart.defaults.plugins.tooltip.titleColor      = '#e0e6ff';
  Chart.defaults.plugins.tooltip.bodyColor       = '#7080a0';
  Chart.defaults.plugins.tooltip.padding         = 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Raw content toggle
// ─────────────────────────────────────────────────────────────────────────────

function initRawToggles() {
  document.querySelectorAll('[id$="RawToggle"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.id.replace('Toggle', 'Content');
      const target   = document.getElementById(targetId);
      if (!target) return;
      const isHidden = target.classList.contains('hidden');
      target.classList.toggle('hidden', !isHidden);
      btn.textContent = isHidden ? 'Ausblenden ↑' : 'Anzeigen ↓';
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  startClock();
  checkHealth();
  applyChartDefaults();
  applyUrlParams();
  initRawToggles();

  // Periodic health check every 30s
  setInterval(checkHealth, 30_000);
});
