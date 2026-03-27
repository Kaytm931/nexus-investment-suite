/**
 * NEXUS Investment Suite — Portfolio Management Module
 * Handles: CRUD positions, P&L display, performance chart,
 *          timeframe filtering, Klumpenrisiko warnings, price refresh.
 */

'use strict';

const portfolioModule = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  let positions          = [];
  let performanceData    = null;
  let performanceChart   = null;
  let sectorChart        = null;
  let regionChart        = null;
  let activeTimeframe    = 'ALL';
  let isRefreshing       = false;

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    document.getElementById('addPositionBtn').addEventListener('click', () => openModal());
    document.getElementById('refreshPricesBtn').addEventListener('click', handleRefreshPrices);
    document.getElementById('modalSaveBtn').addEventListener('click', handleModalSave);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('modalClose').addEventListener('click', closeModal);

    // Close modal on overlay click
    document.getElementById('positionModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('positionModal')) closeModal();
    });

    // Timeframe buttons
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTimeframe = btn.dataset.tf;
        if (performanceData) renderPerformanceChart(performanceData, activeTimeframe);
      });
    });

    // Set default date to today
    document.getElementById('posPurchaseDate').valueAsDate = new Date();

    // Load data
    loadPortfolio();
    loadPerformance();
  }

  function onTabActivate() {
    loadPortfolio();
    loadPerformance();
  }

  // ── Data Loading ──────────────────────────────────────────────────────────
  async function loadPortfolio() {
    try {
      positions = await apiGet('/api/portfolio');
      NEXUS.portfolioPositions = positions;
      renderPositionsTable(positions);
      renderMetrics(positions);
      renderBreakdown(positions);
      renderKlumpenWarnings(positions);
    } catch (err) {
      console.error('[Portfolio] Load error:', err);
      showToast('Portfolio laden fehlgeschlagen', 'error');
    }
  }

  async function loadPerformance() {
    try {
      performanceData = await apiGet('/api/portfolio/performance');
      if (performanceData) {
        renderPerformanceChart(performanceData, activeTimeframe);
      }
    } catch (err) {
      console.error('[Portfolio] Performance load error:', err);
    }
  }

  // ── Metrics Row ───────────────────────────────────────────────────────────
  function renderMetrics(positions) {
    const totalValue    = positions.reduce((s, p) => s + (p.current_value  || 0), 0);
    const totalCost     = positions.reduce((s, p) => s + (p.cost_basis     || 0), 0);
    const totalPnl      = totalValue - totalCost;
    const totalPnlPct   = totalCost > 0 ? ((totalValue / totalCost) - 1) * 100 : 0;

    document.getElementById('metricTotalValue').textContent    = formatCurrency(totalValue, 2, '$');
    document.getElementById('metricPositionCount').textContent = positions.length;

    const pnlEl    = document.getElementById('metricTotalPnl');
    const pnlPctEl = document.getElementById('metricTotalPnlPct');
    pnlEl.textContent    = (totalPnl >= 0 ? '+' : '') + formatCurrency(totalPnl, 2, '$');
    pnlPctEl.textContent = formatPct(totalPnlPct);
    pnlEl.className    = `metric-value ${totalPnl >= 0 ? 'positive' : 'negative'}`;
    pnlPctEl.className = `metric-value ${totalPnlPct >= 0 ? 'positive' : 'negative'}`;

    // Alpha (requires performance data)
    if (performanceData && performanceData.alpha_vs_sp500 !== null) {
      const alphaEl = document.getElementById('metricAlpha');
      alphaEl.textContent = formatPct(performanceData.alpha_vs_sp500, true);
      alphaEl.className   = `metric-value ${performanceData.alpha_vs_sp500 >= 0 ? 'positive' : 'negative'}`;
    }
  }

  // ── Positions Table ───────────────────────────────────────────────────────
  function renderPositionsTable(positions) {
    const container = document.getElementById('portfolioTableContainer');
    const emptyEl   = document.getElementById('portfolioEmptyState');

    if (!positions || positions.length === 0) {
      container.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }

    emptyEl.style.display = 'none';

    let html = `
      <table>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Name</th>
            <th>Kaufpreis</th>
            <th>Akt. Kurs</th>
            <th>Anteile</th>
            <th>Einstand</th>
            <th>Akt. Wert</th>
            <th>P&L</th>
            <th>P&L %</th>
            <th>Gewichtung</th>
            <th>Sektor</th>
            <th>Region</th>
            <th>Kaufdatum</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
    `;

    positions.forEach(pos => {
      const pnlCls     = (pos.pnl || 0) >= 0 ? 'td-positive' : 'td-negative';
      const pnlPctCls  = (pos.pnl_pct || 0) >= 0 ? 'td-positive' : 'td-negative';

      html += `<tr data-id="${pos.id}">
        <td>
          <span class="td-ticker" data-ticker="${escapeHtml(pos.ticker)}" title="Altair-Analyse">
            ${escapeHtml(pos.ticker)}
          </span>
        </td>
        <td>${escapeHtml(pos.name || '—')}</td>
        <td class="td-number">${formatCurrency(pos.entry_price)}</td>
        <td class="td-number">${pos.current_price ? formatCurrency(pos.current_price) : '<span style="color:var(--text-dim)">—</span>'}</td>
        <td class="td-number">${pos.shares ? pos.shares.toLocaleString('de-DE', { maximumFractionDigits: 3 }) : '—'}</td>
        <td class="td-number">${formatCurrency(pos.cost_basis, 2, '$')}</td>
        <td class="td-number">${formatCurrency(pos.current_value, 2, '$')}</td>
        <td class="td-number ${pnlCls}">${pos.pnl !== null ? (pos.pnl >= 0 ? '+' : '') + formatCurrency(pos.pnl, 2, '$') : '—'}</td>
        <td class="td-number ${pnlPctCls}">${pos.pnl_pct !== null ? formatPct(pos.pnl_pct) : '—'}</td>
        <td class="td-number">${pos.weight !== null ? pos.weight.toFixed(1) + '%' : '—'}</td>
        <td>${escapeHtml(pos.sector || '—')}</td>
        <td>${escapeHtml(pos.region || '—')}</td>
        <td>${formatDate(pos.purchase_date)}</td>
        <td>
          <div class="td-actions">
            <button class="action-btn action-btn--analyze" data-ticker="${escapeHtml(pos.ticker)}" title="Altair Deep Dive">◆</button>
            <button class="action-btn" data-action="edit" data-id="${pos.id}" title="Bearbeiten">✎</button>
            <button class="action-btn action-btn--danger" data-action="delete" data-id="${pos.id}" title="Löschen">✕</button>
          </div>
        </td>
      </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Attach event handlers
    container.querySelectorAll('.td-ticker, .action-btn--analyze').forEach(el => {
      el.addEventListener('click', () => {
        const ticker = el.dataset.ticker;
        if (ticker) openAltairWithTicker(ticker);
      });
    });

    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id  = parseInt(btn.dataset.id);
        const pos = positions.find(p => p.id === id);
        if (pos) openModal(pos);
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        handleDeletePosition(id);
      });
    });
  }

  // ── Klumpenrisiko Warnings ────────────────────────────────────────────────
  function renderKlumpenWarnings(positions) {
    const container = document.getElementById('klumpenWarnings');
    container.innerHTML = '';

    if (!positions.length) return;

    const totalValue = positions.reduce((s, p) => s + (p.current_value || 0), 0);
    if (totalValue <= 0) return;

    // Sector concentration
    const sectorTotals = {};
    positions.forEach(p => {
      const sec = p.sector || 'Unbekannt';
      sectorTotals[sec] = (sectorTotals[sec] || 0) + (p.current_value || 0);
    });

    Object.entries(sectorTotals).forEach(([sec, val]) => {
      const pct = (val / totalValue) * 100;
      if (pct > 30) {
        const div = document.createElement('div');
        div.className = 'alert alert--warning';
        div.innerHTML = `<span class="alert-icon">⚠</span>
          <span><strong>Sektor-Klumpenrisiko:</strong> ${escapeHtml(sec)} macht ${pct.toFixed(1)}% des Portfolios aus (Schwelle: 30%).</span>`;
        container.appendChild(div);
      }
    });

    // Region concentration
    const regionTotals = {};
    positions.forEach(p => {
      const reg = p.region || 'Unbekannt';
      regionTotals[reg] = (regionTotals[reg] || 0) + (p.current_value || 0);
    });

    Object.entries(regionTotals).forEach(([reg, val]) => {
      const pct = (val / totalValue) * 100;
      if (pct > 50) {
        const div = document.createElement('div');
        div.className = 'alert alert--warning';
        div.innerHTML = `<span class="alert-icon">⚠</span>
          <span><strong>Regionen-Klumpenrisiko:</strong> ${escapeHtml(reg)} macht ${pct.toFixed(1)}% des Portfolios aus (Schwelle: 50%).</span>`;
        container.appendChild(div);
      }
    });
  }

  // ── Sector/Region Breakdown Charts ───────────────────────────────────────
  function renderBreakdown(positions) {
    const totalValue = positions.reduce((s, p) => s + (p.current_value || 0), 0);
    if (totalValue <= 0) return;

    // Aggregate sectors
    const sectorMap = {};
    positions.forEach(p => {
      const key = p.sector || 'Sonstige';
      sectorMap[key] = (sectorMap[key] || 0) + (p.current_value || 0);
    });

    // Aggregate regions
    const regionMap = {};
    positions.forEach(p => {
      const key = p.region || 'Unbekannt';
      regionMap[key] = (regionMap[key] || 0) + (p.current_value || 0);
    });

    renderPieChart('sectorChart', sectorMap, totalValue, 'sectorBreakdown');
    renderPieChart('regionChart', regionMap, totalValue, 'regionBreakdown');
  }

  function renderPieChart(canvasId, dataMap, totalValue, breakdownId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labels  = Object.keys(dataMap);
    const values  = Object.values(dataMap);
    const palette = [
      '#00d4ff', '#00ff88', '#ffaa00', '#ff3366', '#8855ff',
      '#ff6633', '#33ccff', '#ffcc00', '#cc33ff', '#66ff66',
      '#ff9966', '#0099ff',
    ];
    const colors  = labels.map((_, i) => palette[i % palette.length]);

    // Destroy existing
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data:            values,
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor:     colors,
          borderWidth:     1,
          hoverOffset:     4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend:  { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = ((ctx.raw / totalValue) * 100).toFixed(1);
                return ` ${ctx.label}: ${pct}%`;
              },
            },
          },
        },
      },
    });

    // Render breakdown list
    const listEl = document.getElementById(breakdownId);
    if (!listEl) return;
    listEl.innerHTML = '';

    const sorted = labels
      .map((label, i) => ({ label, value: values[i], color: colors[i] }))
      .sort((a, b) => b.value - a.value);

    sorted.forEach(item => {
      const pct       = (item.value / totalValue) * 100;
      const fillClass = pct > 50 ? 'danger' : pct > 30 ? 'warning' : '';
      const div       = document.createElement('div');
      div.className   = 'breakdown-item';
      div.innerHTML   = `
        <div class="breakdown-label" style="color:${item.color}">${escapeHtml(item.label)}</div>
        <div class="breakdown-bar-track">
          <div class="breakdown-bar-fill ${fillClass}" style="width:${Math.min(pct, 100).toFixed(1)}%; background:${item.color}"></div>
        </div>
        <div class="breakdown-pct">${pct.toFixed(1)}%</div>
      `;
      listEl.appendChild(div);
    });
  }

  // ── Performance Chart ─────────────────────────────────────────────────────
  function renderPerformanceChart(data, timeframe) {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (performanceChart) { performanceChart.destroy(); performanceChart = null; }

    if (!data.dates || data.dates.length === 0) return;

    // Filter by timeframe
    const filtered = filterByTimeframe(data, timeframe);

    const tooltipPlugin = {
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(2)} (${((ctx.raw / 100 - 1) * 100).toFixed(1)}%)`,
      },
    };

    performanceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: filtered.dates,
        datasets: [
          {
            label:           'Portfolio',
            data:            filtered.portfolio_values,
            borderColor:     '#00d4ff',
            backgroundColor: 'rgba(0, 212, 255, 0.05)',
            borderWidth:     2,
            pointRadius:     0,
            pointHoverRadius: 4,
            tension:         0.3,
            fill:            true,
          },
          {
            label:           'S&P 500',
            data:            filtered.sp500_values,
            borderColor:     '#00ff88',
            backgroundColor: 'transparent',
            borderWidth:     1.5,
            pointRadius:     0,
            tension:         0.3,
            borderDash:      [4, 4],
          },
          {
            label:           'MSCI World',
            data:            filtered.msci_values,
            borderColor:     '#8855ff',
            backgroundColor: 'transparent',
            borderWidth:     1.5,
            pointRadius:     0,
            tension:         0.3,
            borderDash:      [2, 4],
          },
        ],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend:  { display: false },
          tooltip: tooltipPlugin,
        },
        scales: {
          y: {
            grid:  { color: '#151530' },
            ticks: {
              callback: (v) => `${v.toFixed(0)}`,
              color: '#7080a0',
            },
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#7080a0',
              maxTicksLimit: 8,
              callback: function(val, idx) {
                const label = this.getLabelForValue(val);
                return label ? label.slice(0, 7) : '';
              },
            },
          },
        },
      },
    });
  }

  function filterByTimeframe(data, tf) {
    const allDates = data.dates;
    if (!allDates.length) return data;

    const now  = new Date();
    let cutoff = null;

    if (tf === '1M') cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    else if (tf === '3M') cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    else if (tf === '6M') cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    else if (tf === '1J') cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    if (!cutoff) return data;

    const startIdx = allDates.findIndex(d => new Date(d) >= cutoff);
    if (startIdx <= 0) return data;

    const sliceDates = allDates.slice(startIdx);
    const basePort   = data.portfolio_values[startIdx] || 100;
    const baseSP     = data.sp500_values[startIdx] || 100;
    const baseMSCI   = data.msci_values[startIdx] || 100;

    return {
      dates:             sliceDates,
      portfolio_values:  data.portfolio_values.slice(startIdx).map(v => (v / basePort) * 100),
      sp500_values:      data.sp500_values.slice(startIdx).map(v => (v / baseSP) * 100),
      msci_values:       data.msci_values.slice(startIdx).map(v => (v / baseMSCI) * 100),
    };
  }

  // ── Modal (Add / Edit) ────────────────────────────────────────────────────
  function openModal(existingPosition = null) {
    const modal    = document.getElementById('positionModal');
    const titleEl  = document.getElementById('modalTitle');
    const form     = document.getElementById('positionForm');

    form.reset();
    document.getElementById('posPurchaseDate').valueAsDate = new Date();

    if (existingPosition) {
      titleEl.textContent = 'Position bearbeiten';
      document.getElementById('positionId').value       = existingPosition.id;
      document.getElementById('posTickerInput').value   = existingPosition.ticker || '';
      document.getElementById('posNameInput').value     = existingPosition.name || '';
      document.getElementById('posEntryPrice').value    = existingPosition.entry_price || '';
      document.getElementById('posShares').value        = existingPosition.shares || '';
      document.getElementById('posPurchaseDate').value  = existingPosition.purchase_date || '';
      document.getElementById('posCurrentPrice').value  = existingPosition.current_price || '';
      document.getElementById('posSector').value        = existingPosition.sector || '';
      document.getElementById('posRegion').value        = existingPosition.region || '';
    } else {
      titleEl.textContent = 'Position hinzufügen';
      document.getElementById('positionId').value = '';
    }

    modal.classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('positionModal').classList.add('hidden');
  }

  async function handleModalSave() {
    const id           = document.getElementById('positionId').value;
    const ticker       = document.getElementById('posTickerInput').value.trim().toUpperCase();
    const name         = document.getElementById('posNameInput').value.trim();
    const entryPrice   = parseFloat(document.getElementById('posEntryPrice').value);
    const shares       = parseFloat(document.getElementById('posShares').value);
    const purchaseDate = document.getElementById('posPurchaseDate').value;
    const currentPrice = document.getElementById('posCurrentPrice').value;
    const sector       = document.getElementById('posSector').value;
    const region       = document.getElementById('posRegion').value;

    if (!ticker || !name || isNaN(entryPrice) || isNaN(shares) || !purchaseDate) {
      showToast('Bitte alle Pflichtfelder ausfüllen', 'warning');
      return;
    }

    const body = {
      ticker,
      name,
      entry_price:   entryPrice,
      shares,
      purchase_date: purchaseDate,
      sector:        sector || null,
      region:        region || null,
    };

    if (currentPrice) body.current_price = parseFloat(currentPrice);

    try {
      if (id) {
        await apiPut(`/api/portfolio/position/${id}`, body);
        showToast('Position aktualisiert', 'success');
      } else {
        await apiPost('/api/portfolio/position', body);
        showToast('Position hinzugefügt', 'success');
      }
      closeModal();
      await loadPortfolio();
      await loadPerformance();
    } catch (err) {
      showToast(`Fehler: ${err.message}`, 'error');
    }
  }

  // ── Delete Position ───────────────────────────────────────────────────────
  async function handleDeletePosition(id) {
    const pos = positions.find(p => p.id === id);
    const name = pos ? `${pos.ticker} (${pos.name})` : `ID ${id}`;

    if (!confirm(`Position "${name}" wirklich löschen?`)) return;

    try {
      await apiDelete(`/api/portfolio/position/${id}`);
      showToast('Position gelöscht', 'success');
      await loadPortfolio();
      await loadPerformance();
    } catch (err) {
      showToast(`Löschen fehlgeschlagen: ${err.message}`, 'error');
    }
  }

  // ── Refresh Prices ────────────────────────────────────────────────────────
  async function handleRefreshPrices() {
    if (isRefreshing) return;
    if (!positions.length) {
      showToast('Keine Positionen vorhanden', 'warning');
      return;
    }

    isRefreshing = true;
    const btn    = document.getElementById('refreshPricesBtn');
    btn.disabled = true;
    btn.textContent = '↻ Aktualisiert...';

    showToast(`Aktualisiere Kurse für ${positions.length} Positionen... (kann mehrere Minuten dauern)`, 'info', 10000);

    try {
      const result = await apiPost('/api/portfolio/refresh-prices', {});
      const msg = `Kurse aktualisiert: ${result.updated} erfolgreich, ${result.failed} fehlgeschlagen.`;
      showToast(msg, result.failed > 0 ? 'warning' : 'success', 6000);
      positions = result.positions;
      NEXUS.portfolioPositions = positions;
      renderPositionsTable(positions);
      renderMetrics(positions);
      renderBreakdown(positions);
      renderKlumpenWarnings(positions);
    } catch (err) {
      showToast(`Fehler bei Kurs-Aktualisierung: ${err.message}`, 'error', 8000);
    } finally {
      isRefreshing     = false;
      btn.disabled     = false;
      btn.textContent  = '↻ Preise aktualisieren';
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return { init, onTabActivate };

})();

document.addEventListener('DOMContentLoaded', () => portfolioModule.init());
