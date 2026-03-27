/**
 * NEXUS Investment Suite — Elara Screener Module
 * Handles: form submission, progress display, markdown table parsing,
 *          sorting/filtering, Altair handoff.
 */

'use strict';

const elaraModule = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  let lastResult        = null;
  let tableData         = [];
  let sortColumn        = null;
  let sortDirection     = 'desc';
  let stopTimer         = null;
  let stopProgressAnim  = null;
  let activeSocket      = null;

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const form           = () => document.getElementById('elaraForm');
  const submitBtn      = () => document.getElementById('elaraSubmitBtn');
  const progressCard   = () => document.getElementById('elaraProgress');
  const progressStatus = () => document.getElementById('elaraProgressStatus');
  const resultsDiv     = () => document.getElementById('elaraResults');
  const filterInput    = () => document.getElementById('elaraFilter');
  const rawMarkdown    = () => document.getElementById('elaraRawMarkdown');
  const sourcesList    = () => document.getElementById('elaraSourcesList');
  const champCard      = () => document.getElementById('elaraSectorChampion');
  const champContent   = () => document.getElementById('elaraSectorChampionContent');

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    form().addEventListener('submit', handleSubmit);
    filterInput().addEventListener('input', () => renderTable());
  }

  // ── Form Submit ───────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();

    const sector   = document.getElementById('elaraSector').value.trim();
    const mktCap   = document.getElementById('elaraMarketCap').value;
    const region   = document.getElementById('elaraRegion').value;
    const horizon  = document.getElementById('elaraHorizon').value;
    const exclus   = document.getElementById('elaraExclusions').value.trim();

    if (!sector) return;

    const sessionId = generateUUID();
    const filters   = {};
    if (mktCap)   filters.min_market_cap = parseFloat(mktCap);
    if (region)   filters.region         = region;
    if (horizon)  filters.horizon        = horizon;
    if (exclus)   filters.exclusions     = exclus;

    startLoading();

    // Connect WebSocket first
    let socket = null;
    try {
      socket = createProgressSocket(sessionId, handleProgressMessage);
      activeSocket = socket;
      await waitForSocketOpen(socket.ws);
    } catch (err) {
      console.warn('[Elara] WS connect failed, continuing without progress:', err);
    }

    try {
      const body = {
        sector,
        session_id: sessionId,
        filters: Object.keys(filters).length > 0 ? filters : null,
      };

      const result = await apiPost('/api/elara/screen', body);
      lastResult = result;

      if (result.cached) {
        showToast('Ergebnis aus Cache geladen (< 24h alt)', 'info');
      } else {
        showToast('Screening abgeschlossen!', 'success');
      }

      displayResults(result);
    } catch (err) {
      showToast(`Fehler: ${err.message}`, 'error', 8000);
      stopLoading(false);
    } finally {
      if (socket) socket.close();
      activeSocket = null;
    }
  }

  // ── Progress Handling ─────────────────────────────────────────────────────
  function handleProgressMessage(data) {
    if (data.type === 'progress') {
      const statusEl = progressStatus();
      if (statusEl) statusEl.textContent = data.message || '';
    } else if (data.type === 'complete') {
      // Will be handled by the POST response
    } else if (data.type === 'error') {
      showToast(data.message || 'Unbekannter Fehler', 'error', 8000);
    }
  }

  // ── Loading State ─────────────────────────────────────────────────────────
  function startLoading() {
    submitBtn().disabled = true;
    submitBtn().querySelector('.btn-text').textContent = 'Läuft...';
    progressCard().classList.remove('hidden');
    resultsDiv().classList.add('hidden');

    stopTimer        = startTimer('elaraTimer');
    stopProgressAnim = startProgressAnimation('elaraProgressBar', 300);
  }

  function stopLoading(success = true) {
    submitBtn().disabled = false;
    submitBtn().querySelector('.btn-text').textContent = 'SCREENING STARTEN';
    progressCard().classList.add('hidden');

    if (stopTimer)        { stopTimer(); stopTimer = null; }
    if (stopProgressAnim) { stopProgressAnim(); stopProgressAnim = null; }

    const bar = document.getElementById('elaraProgressBar');
    if (bar) {
      bar.style.width = success ? '100%' : '0%';
      bar.style.animation = 'none';
    }
  }

  // ── Display Results ───────────────────────────────────────────────────────
  function displayResults(result) {
    stopLoading(true);
    resultsDiv().classList.remove('hidden');

    // Render raw markdown
    rawMarkdown().textContent = result.raw_content || '';

    // Render sources
    renderSources(result.sources || []);

    // Parse the markdown table
    tableData = parseElaraTable(result.raw_content || '');

    // Extract and show sector champion
    const champion = extractSectorChampion(result.raw_content || '');
    if (champion) {
      champCard().style.display = '';
      champContent().innerHTML = renderMarkdown(champion);
    } else {
      champCard().style.display = 'none';
    }

    // Render the main table
    renderTable();

    // Update count
    updateResultsCount(tableData.length);

    // Scroll to results
    resultsDiv().scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Markdown Table Parser ─────────────────────────────────────────────────
  /**
   * Parse a markdown table from the Elara response text.
   * Returns an array of row objects (using the header row as keys).
   */
  function parseElaraTable(markdown) {
    const rows = [];
    if (!markdown) return rows;

    const lines    = markdown.split('\n');
    let headerCols = null;
    let inTable    = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('|')) {
        if (inTable) break; // table ended
        continue;
      }
      // Parse cells
      const cells = trimmed.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);

      // Skip separator rows (|---|---|)
      if (cells.every(c => /^[-: ]+$/.test(c))) continue;

      if (!headerCols) {
        // First row is the header
        headerCols = cells.map(h => h.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim());
        inTable    = true;
        continue;
      }

      // Data row
      const obj = {};
      headerCols.forEach((key, i) => {
        obj[key] = cells[i] || '';
      });
      rows.push(obj);
    }

    return rows;
  }

  // ── Render Table ──────────────────────────────────────────────────────────
  function renderTable() {
    const container = document.getElementById('elaraTableContainer');
    const filter    = (filterInput().value || '').toLowerCase();

    if (tableData.length === 0) {
      // Fall back to rendering the full markdown
      container.innerHTML = `<div class="card-body"><div class="report-content">${
        renderMarkdown(lastResult?.raw_content || 'Keine Tabelle gefunden.')
      }</div></div>`;
      return;
    }

    // Filter
    let filtered = tableData.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(filter))
    );

    // Sort
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const av = parseFloat(String(a[sortColumn]).replace(/[^0-9.-]/g, '')) || 0;
        const bv = parseFloat(String(b[sortColumn]).replace(/[^0-9.-]/g, '')) || 0;
        return sortDirection === 'asc' ? av - bv : bv - av;
      });
    }

    updateResultsCount(filtered.length);

    // Build table HTML
    const columns  = Object.keys(tableData[0] || {});
    const scoreCol = columns.find(c => c.includes('score') || c.includes('elara'));

    let html = '<table><thead><tr>';
    columns.forEach(col => {
      const isSorted = sortColumn === col;
      const cls      = isSorted ? (sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc') : '';
      html += `<th class="${cls}" data-col="${escapeHtml(col)}">${
        col.charAt(0).toUpperCase() + col.slice(1)
      }</th>`;
    });
    html += '<th>Analysieren</th></tr></thead><tbody>';

    filtered.forEach(row => {
      html += '<tr>';
      columns.forEach(col => {
        const val = row[col] || '';

        if (col === 'ticker') {
          html += `<td>
            <span class="td-ticker" data-ticker="${escapeHtml(val)}" title="Altair-Analyse starten">
              ${escapeHtml(val)}
            </span>
          </td>`;
          return;
        }

        // Score column coloring
        if (col === scoreCol) {
          const num = parseFloat(val);
          let cls   = '';
          if (!isNaN(num)) {
            if (num >= 70) cls = 'td-score td-score-high';
            else if (num >= 50) cls = 'td-score td-score-medium';
            else cls = 'td-score td-score-low';
          }
          html += `<td class="${cls}">${escapeHtml(val)}</td>`;
          return;
        }

        // Numeric columns
        const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num) && val !== '' && col !== '#' && col !== 'moat') {
          html += `<td class="td-number">${escapeHtml(val)}</td>`;
          return;
        }

        html += `<td>${escapeHtml(val)}</td>`;
      });

      // Analyze button
      const ticker = row['ticker'] || '';
      html += `<td>
        <button class="action-btn action-btn--analyze" data-ticker="${escapeHtml(ticker)}" title="Altair-Analyse">
          ◆ Deep Dive
        </button>
      </td>`;

      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Attach sort handlers
    container.querySelectorAll('thead th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (sortColumn === col) {
          sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          sortColumn    = col;
          sortDirection = 'desc';
        }
        renderTable();
      });
    });

    // Attach ticker click handlers
    container.querySelectorAll('.td-ticker, .action-btn--analyze').forEach(el => {
      el.addEventListener('click', () => {
        const ticker = el.dataset.ticker;
        if (ticker) openAltairWithTicker(ticker);
      });
    });
  }

  // ── Sector Champion Extractor ─────────────────────────────────────────────
  function extractSectorChampion(markdown) {
    if (!markdown) return null;
    const match = markdown.match(/###?\s*3\.1\s+Sector Champion[^\n]*\n([\s\S]*?)(?=###|##|\n---|\n\n---|$)/i)
                || markdown.match(/Sector Champion[^\n]*\n([\s\S]{50,300}?)(?=\n#|---)/i);
    return match ? match[1].trim() : null;
  }

  // ── Sources Renderer ──────────────────────────────────────────────────────
  function renderSources(sources) {
    const el = sourcesList();
    el.innerHTML = '';
    if (!sources || sources.length === 0) {
      el.innerHTML = '<span style="font-size:11px;color:var(--text-dim)">Keine Quellen verfügbar.</span>';
      return;
    }
    sources.forEach(src => {
      const url   = typeof src === 'string' ? src : (src.url || src);
      const title = typeof src === 'object' ? (src.title || url) : url;
      const a     = document.createElement('a');
      a.href      = url;
      a.target    = '_blank';
      a.rel       = 'noopener noreferrer';
      a.className = 'source-chip';
      a.textContent = truncate(title, 50);
      a.title       = url;
      el.appendChild(a);
    });
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  function updateResultsCount(count) {
    const el = document.getElementById('elaraResultsCount');
    if (el) el.textContent = `${count} Titel`;
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return { init };

})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => elaraModule.init());
