/**
 * NEXUS Investment Suite — Altair Deep Dive Module
 * Handles: form submission, report parsing, DCF chart, Conviction gauge,
 *          Timing signal, Returns chart, PDF export, Klumpenrisiko check.
 */

'use strict';

const altairModule = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  let lastResult       = null;
  let dcfChart         = null;
  let returnsChart     = null;
  let convictionChart  = null;
  let stopTimer        = null;
  let stopProgressAnim = null;
  let abortController  = null;   // for cancelling the running analysis

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const form           = () => document.getElementById('altairForm');
  const submitBtn      = () => document.getElementById('altairSubmitBtn');
  const progressCard   = () => document.getElementById('altairProgress');
  const progressStatus = () => document.getElementById('altairProgressStatus');
  const resultsDiv     = () => document.getElementById('altairResults');
  const reportContent  = () => document.getElementById('altairReportContent');

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    form().addEventListener('submit', handleSubmit);
    document.getElementById('altairStopBtn')?.addEventListener('click', handleStop);
    initTickerValidator();
  }

  // ── Ticker Input Validator ────────────────────────────────────────────────
  function initTickerValidator() {
    const input = document.getElementById('altairTicker');
    const hint  = document.getElementById('tickerHint');
    if (!input || !hint) return;

    input.addEventListener('input', () => {
      const raw = input.value;
      const val = raw.trim().toUpperCase();
      const msg = validateTickerInput(val, raw);

      if (msg) {
        hint.textContent = msg.text;
        hint.className   = `ticker-hint ticker-hint--${msg.level}`;
      } else {
        hint.textContent = '';
        hint.className   = 'ticker-hint hidden';
      }
    });
  }

  function validateTickerInput(val, raw) {
    if (!val) return null;

    // Leading/trailing whitespace
    if (raw !== raw.trim()) {
      return { level: 'warn', text: 'Leerzeichen am Anfang oder Ende entfernen' };
    }

    // Internal spaces
    if (/\s/.test(val)) {
      return { level: 'warn', text: 'Keine Leerzeichen — Ticker (z.B. AAPL) oder ISIN (z.B. US0378331005) eingeben' };
    }

    // ISIN-like: starts with exactly 2 letters, ≥7 chars (avoids false-positive on tickers like MSFT)
    const isIsinLike = /^[A-Z]{2}[A-Z0-9]*$/.test(val) && val.length >= 7;
    if (isIsinLike) {
      if (val.length < 12) {
        return { level: 'warn', text: `ISIN muss genau 12 Zeichen haben — aktuell ${val.length} von 12 (Beispiel: US0378331005)` };
      }
      if (val.length > 12) {
        return { level: 'error', text: `ISIN zu lang: ${val.length} Zeichen — ISIN hat genau 12 Zeichen` };
      }
      // Validate ISIN checksum structure: 2 letters + 9 alphanumeric + 1 digit
      if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(val)) {
        return { level: 'warn', text: 'ISIN-Format prüfen: 2 Buchstaben + 9 Zeichen + 1 Prüfziffer (z.B. US0378331005)' };
      }
      return null; // valid ISIN
    }

    // Standard ticker: only letters, digits, dot, hyphen, caret (for indices like ^SPX)
    if (!/^[\^A-Z0-9.\-]+$/.test(val)) {
      return { level: 'warn', text: 'Ungültige Zeichen — Ticker: nur Buchstaben/Zahlen/Punkt/Bindestrich (z.B. AAPL, BRK.B, ^SPX)' };
    }

    // Warn if ticker looks like a partial ISIN (2 letters + digits only, 7-11 chars)
    if (/^[A-Z]{2}\d+$/.test(val) && val.length >= 7 && val.length < 12) {
      return { level: 'warn', text: `Sieht nach einer unvollständigen ISIN aus (${val.length}/12 Zeichen) — oder ist das ein Ticker?` };
    }

    return null;
  }

  // ── Form Submit ───────────────────────────────────────────────────────────
  async function handleSubmit(e, forceRefresh = false) {
    if (e) e.preventDefault();

    const ticker = document.getElementById('altairTicker').value.trim().toUpperCase();
    if (!ticker) return;

    const sessionId = generateUUID();

    // Create fresh AbortController for this analysis run
    abortController = new AbortController();

    startLoading(ticker);

    // Connect WebSocket
    let socket = null;
    try {
      socket = createProgressSocket(sessionId, handleProgressMessage);
      await waitForSocketOpen(socket.ws);
    } catch (err) {
      console.warn('[Altair] WS connect failed:', err);
    }

    try {
      const result = await apiPost('/api/altair/analyze', {
        ticker,
        session_id: sessionId,
        force_refresh: forceRefresh,
      }, abortController.signal);
      lastResult = result;

      if (result.cached) {
        showToast(`Analyse für ${ticker} aus Cache (< 7 Tage alt) — "Neu analysieren" für frische Daten`, 'info');
      } else {
        showToast(`Altair-Analyse für ${ticker} abgeschlossen!`, 'success');
      }

      displayResults(result);
    } catch (err) {
      if (err.name === 'AbortError') {
        showToast('Analyse abgebrochen.', 'info');
      } else {
        showToast(`Fehler: ${err.message}`, 'error', 8000);
      }
      stopLoading(false);
    } finally {
      abortController = null;
      if (socket) socket.close();
    }
  }

  function handleStop() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  async function handleForceRefresh() {
    await handleSubmit(null, true);
  }

  // ── Progress ──────────────────────────────────────────────────────────────
  function handleProgressMessage(data) {
    if (data.type === 'progress') {
      const el = progressStatus();
      if (el) el.textContent = data.message || '';
    } else if (data.type === 'error') {
      showToast(data.message || 'Fehler', 'error', 8000);
    }
  }

  function startLoading(ticker) {
    submitBtn().disabled = true;
    submitBtn().querySelector('.btn-text').textContent = 'Analysiert...';
    progressCard().classList.remove('hidden');
    resultsDiv().classList.add('hidden');

    // Reset ticker display
    document.getElementById('altairDashTicker').textContent = ticker;
    document.getElementById('altairDashName').textContent   = '';

    stopTimer        = startTimer('altairTimer');
    stopProgressAnim = startProgressAnimation('altairProgressBar', 300);
  }

  function stopLoading(success = true) {
    submitBtn().disabled = false;
    submitBtn().querySelector('.btn-text').textContent = 'ANALYSE STARTEN';
    progressCard().classList.add('hidden');

    if (stopTimer)        { stopTimer(); stopTimer = null; }
    if (stopProgressAnim) { stopProgressAnim(); stopProgressAnim = null; }

    const bar = document.getElementById('altairProgressBar');
    if (bar) { bar.style.width = success ? '100%' : '0%'; bar.style.animation = 'none'; }
  }

  // ── Display Results ───────────────────────────────────────────────────────
  function displayResults(result) {
    stopLoading(true);
    resultsDiv().classList.remove('hidden');

    const content = result.raw_content || '';
    const ticker  = result.ticker || '';

    // ── Dashboard header ───────────────────────────────────────────────────
    document.getElementById('altairDashTicker').textContent = ticker;
    const nameMatch = content.match(/^#\s+(.+)/m) ||
                      content.match(/^##\s+.+?[—–-]\s*(.+)/m);
    document.getElementById('altairDashName').textContent = nameMatch ? nameMatch[1].trim() : '';

    // Show "Neu analysieren" button only for cached results
    const refreshBtn = document.getElementById('altairRefreshBtn');
    if (refreshBtn) refreshBtn.style.display = result.cached ? '' : 'none';

    // ── Parse structured data ──────────────────────────────────────────────
    const parsed = parseAltairReport(content);

    // Conviction Score
    renderConvictionGauge(parsed.convictionScore);

    // Timing Signal
    renderTimingSignal(parsed.timingSignal);

    // Position size
    const posSizeEl = document.getElementById('positionSize');
    if (parsed.positionSize) {
      posSizeEl.textContent = parsed.positionSize;
    } else {
      posSizeEl.textContent = '—';
    }

    // Verdict
    renderVerdict(parsed.verdict);

    // DCF Chart
    if (parsed.dcfScenarios.length > 0) {
      renderDcfChart(parsed.dcfScenarios, ticker);
    } else {
      document.getElementById('dcfChart').closest('.card').style.display =
        content.toLowerCase().includes('etf') ? 'none' : '';
    }

    // Snapshot table
    if (parsed.snapshotTable) {
      document.getElementById('altairSnapshotTable').innerHTML = parsed.snapshotTable;
    }

    // Returns table + chart
    if (parsed.returnsData.length > 0) {
      renderReturnsTable(parsed.returnsData);
      renderReturnsChart(parsed.returnsData);
    }

    // Full report
    reportContent().innerHTML = renderMarkdown(content);

    // Sources
    renderSources(result.sources || []);

    // Klumpenrisiko check
    checkKlumpenrisiko(ticker, parsed.convictionScore);

    // ── Validation layer ───────────────────────────────────────────────────
    const validation = validateReport(parsed, result);
    renderValidationPanel(validation);

    resultsDiv().scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Validation Layer ──────────────────────────────────────────────────────

  function validateReport(parsed, result) {
    const errors   = [];   // ❌ mathematisch falsch — Investor könnte Geld verlieren
    const warnings = [];   // ⚠️ Widersprüche oder Datenlücken
    const info     = [];   // ℹ️ Hinweise

    const toNum = (str) => {
      if (str == null) return null;
      const n = parseFloat(String(str).replace(/[^0-9.-]/g, ''));
      return isNaN(n) ? null : n;
    };

    const content = result.raw_content || '';

    // Detect ETF early so we can skip stock-only checks
    const isEtfReport = /\b(ETF|Exchange.Traded Fund|Indexfonds)\b/i.test(content) ||
                        /^#+\s*[^#\n]*ETF/im.test(content);

    // ── 1. Ticker-Korrektur transparent machen ─────────────────────────────
    // Backend injects a HINWEIS line when auto-resolving tickers
    const tickerCorrection = content.match(
      /HINWEIS:\s*['"']?(\S+)['"']?\s+wurde\s+automatisch.*?['"']?(\S+)['"']?\s+aufgelöst/i
    );
    if (tickerCorrection) {
      info.push(`Ticker automatisch korrigiert: "${tickerCorrection[1]}" → "${tickerCorrection[2]}"`);
    }

    // ── 2. Rendite-Mathematik pro Szenario prüfen (nur Aktien, nicht ETF) ──
    for (const row of !isEtfReport ? parsed.returnsData : []) {
      const fv  = toNum(row.fairValue);
      const kk  = toNum(row.kaufkurs);
      if (!fv || !kk || kk <= 0) continue;

      const expectedTotalPct  = (fv / kk - 1) * 100;
      const expectedPa3       = ((fv / kk) ** (1 / 3) - 1) * 100;
      const expectedPa5       = ((fv / kk) ** (1 / 5) - 1) * 100;

      const r3  = toNum(row.return3y);
      const r5  = toNum(row.return5y);
      const pa  = toNum(row.pa);

      // Tolerance: 8 percentage points (models round differently)
      const tol = 8;

      if (r3 !== null && Math.abs(r3 - expectedTotalPct) > tol) {
        errors.push({
          label:    `${row.scenario} — Rendite 3J`,
          reported: `${r3 > 0 ? '+' : ''}${r3.toFixed(1)}%`,
          correct:  `${expectedTotalPct > 0 ? '+' : ''}${expectedTotalPct.toFixed(1)}%`,
          reason:   `Fair Value ${fv} ÷ Kaufkurs ${kk} − 1 = ${expectedTotalPct.toFixed(1)}%`,
        });
      }
      if (r5 !== null && Math.abs(r5 - expectedTotalPct) > tol) {
        errors.push({
          label:    `${row.scenario} — Rendite 5J`,
          reported: `${r5 > 0 ? '+' : ''}${r5.toFixed(1)}%`,
          correct:  `${expectedTotalPct > 0 ? '+' : ''}${expectedTotalPct.toFixed(1)}%`,
          reason:   `Gleiche Formel wie 3J (Gesamtrendite bis Fair Value)`,
        });
      }
      if (pa !== null) {
        // p.a. could be 3J or 5J annualized — check both, accept if either is within tolerance
        const pa3ok = Math.abs(pa - expectedPa3) <= tol;
        const pa5ok = Math.abs(pa - expectedPa5) <= tol;
        if (!pa3ok && !pa5ok) {
          errors.push({
            label:    `${row.scenario} — p.a.`,
            reported: `${pa > 0 ? '+' : ''}${pa.toFixed(1)}%`,
            correct:  `${expectedPa3 > 0 ? '+' : ''}${expectedPa3.toFixed(1)}% (3J) / ${expectedPa5 > 0 ? '+' : ''}${expectedPa5.toFixed(1)}% (5J)`,
            reason:   `(FV/Kaufkurs)^(1/n) − 1`,
          });
        }
      }
    }

    // ── 3. Margin of Safety Vorzeichen prüfen (nur Aktien) ────────────────
    for (const s of !isEtfReport ? parsed.dcfScenarios : []) {
      if (s.mos === null) continue;
      // Find the kaufkurs from the returns table
      const retRow = parsed.returnsData.find(r =>
        r.scenario.toLowerCase().includes(s.label.toLowerCase().split(' ')[0].toLowerCase())
      );
      const kk = toNum(retRow?.kaufkurs);
      if (!kk) continue;

      const expectedMoS = (s.fairValue / kk - 1) * 100;
      const reported    = s.mos;

      // Check sign flip
      if (Math.sign(reported) !== Math.sign(expectedMoS) && Math.abs(expectedMoS) > 5) {
        errors.push({
          label:    `${s.label} — Margin of Safety`,
          reported: `${reported > 0 ? '+' : ''}${reported.toFixed(1)}%`,
          correct:  `${expectedMoS > 0 ? '+' : ''}${expectedMoS.toFixed(1)}%`,
          reason:   `Fair Value $${s.fairValue} vs. Kaufkurs $${kk} — Vorzeichen vertauscht`,
        });
      }
    }

    // ── 4. Interne Konsistenz: Fazit vs. Timing vs. Conviction ────────────
    const { convictionScore, timingSignal, verdict } = parsed;

    if (verdict && timingSignal && convictionScore !== null) {
      const undervalued = verdict.label === 'Unterbewertet';
      const expensive   = verdict.label === 'Teuer';

      if (undervalued && timingSignal === 'red' && convictionScore <= 2) {
        warnings.push(
          `Dreifacher Widerspruch: Fazit "Unterbewertet" — aber Timing 🔴 NUR WATCHLIST und Conviction ${convictionScore}/7. ` +
          `Wenn wirklich unterbewertet, sollte Conviction höher sein oder ein klarer Grund für WATCHLIST genannt werden.`
        );
      } else if (undervalued && timingSignal === 'red') {
        warnings.push(`Widerspruch: Fazit "Unterbewertet" aber Timing-Signal 🔴 NUR WATCHLIST — fehlt eine Erklärung?`);
      } else if (undervalued && convictionScore <= 1) {
        warnings.push(`Widerspruch: Fazit "Unterbewertet" aber Conviction Score ${convictionScore}/7 bedeutet "Nicht kaufen".`);
      }

      if (expensive && timingSignal === 'green') {
        warnings.push(`Widerspruch: Fazit "Teuer" aber Timing-Signal 🟢 JETZT KAUFEN.`);
      }
    }

    // ── 5. Conviction-Score Plausibilität ─────────────────────────────────
    if (parsed.dcfScenarios.length > 0 && convictionScore !== null) {
      const retRow = parsed.returnsData.find(r => /base/i.test(r.scenario));
      const kk     = toNum(retRow?.kaufkurs);
      const baseFV = parsed.dcfScenarios.find(s => /base/i.test(s.label))?.fairValue;

      if (kk && baseFV) {
        const mos = (baseFV / kk - 1) * 100;
        const expectedMinScore = mos > 30 ? 2 : mos > 15 ? 1 : 0; // from scoring rules

        if (convictionScore < expectedMinScore) {
          warnings.push(
            `Conviction Score ${convictionScore}/7 scheint niedrig: ` +
            `Base Case MoS ${mos.toFixed(1)}% würde laut Scoring-Regel +${expectedMinScore} Punkte ergeben.`
          );
        }
      }
    }

    // ── 6. Datenlücken ─────────────────────────────────────────────────────
    if (parsed.returnsData.length === 0 && parsed.dcfScenarios.length > 0) {
      warnings.push('Rendite-Erwartungs-Tabelle fehlt im Report obwohl DCF-Szenarien vorhanden sind.');
    }
    if (parsed.dcfScenarios.length === 0 && !isEtfReport) {
      info.push('Keine DCF-Szenarien extrahierbar — ETF, Bank oder alternatives Bewertungsmodell?');
    }

    // ── 7. Widersprüchliche Timing-Signale im selben Report ───────────────
    const signalsFound = [];
    if (/GRÜNES LICHT|Grünes Licht/i.test(content))                     signalsFound.push('🟢 GRÜNES LICHT');
    if (/GELBES LICHT|Gelbes Licht|WARTE AUF RÜCKSETZER/i.test(content)) signalsFound.push('🟡 GELBES LICHT');
    if (/ROTES LICHT|Rotes Licht|NUR WATCHLIST/i.test(content))          signalsFound.push('🔴 ROTES LICHT');

    if (signalsFound.length > 1) {
      warnings.push(
        `Widersprüchliche Timing-Signale: ${signalsFound.join(' und ')} werden gleichzeitig genannt — ` +
        `nur eines sollte im Report erscheinen. Dashboard und Fazit prüfen.`
      );
    }

    // ── 8. ETF-Pflichtfelder ───────────────────────────────────────────────
    if (isEtfReport) {
      // Required ETF fields
      if (!/\bTER\b|\bKostenquote\b/i.test(content)) {
        warnings.push('ETF-Pflichtfeld fehlt: TER (Total Expense Ratio) — wichtig für Renditeerwartung');
      }
      if (!/Replikation|physisch|synthetisch/i.test(content)) {
        warnings.push('ETF-Pflichtfeld fehlt: Replikationsmethode (physisch / synthetisch)');
      }
      if (!/Top\s*\d*\s*Holdings?|Top\s*\d*\s*Positionen?|Größte\s+Positionen?/i.test(content)) {
        warnings.push('ETF-Pflichtfeld fehlt: Top Holdings — wichtig für Klumpenrisiko-Bewertung');
      }
      if (!/Ausschütt|thesaurierend|distribut|accumulat/i.test(content)) {
        warnings.push('ETF-Pflichtfeld fehlt: Ausschüttungsart (thesaurierend / ausschüttend)');
      }
      if (!/Tracking\s*(?:Difference|Error|Differenz)/i.test(content)) {
        warnings.push('ETF-Pflichtfeld fehlt: Tracking Difference — misst wie gut der ETF den Index repliziert');
      }

      // Inappropriate stock-analysis metrics used for ETF
      if (/\bDCF\b|Discounted\s*Cash\s*Flow|Fair\s*Value\s*\(DCF\)/i.test(content)) {
        warnings.push('Achtung: DCF/Fair Value für einen ETF angegeben — nicht sinnvoll (ETFs haben keinen intrinsischen Wert)');
      }
      if (/Insider(?:käufe|aktivität|transaktionen?)/i.test(content)) {
        warnings.push('Achtung: Insider-Aktivität für einen ETF analysiert — nicht anwendbar');
      }
      if (/\bEV\/EBITDA\b/i.test(content)) {
        warnings.push('Achtung: EV/EBITDA für einen ETF angegeben — für Index-ETFs nicht sinnvoll');
      }
    }

    return { errors, warnings, info };
  }

  function renderValidationPanel(v) {
    const el = document.getElementById('altairValidation');
    if (!el) return;

    const total = v.errors.length + v.warnings.length + v.info.length;
    if (total === 0) {
      el.innerHTML = `
        <div class="validation-panel validation-panel--clean">
          <span class="val-icon">✓</span>
          Interne Konsistenzprüfung: keine Widersprüche oder Rechenfehler erkannt.
        </div>`;
      el.classList.remove('hidden');
      return;
    }

    let html = `<div class="validation-panel">
      <div class="val-header">
        <span class="val-title">⚠ Qualitäts-Check</span>
        <span class="val-summary">
          ${v.errors.length > 0   ? `<span class="val-badge val-badge--error">${v.errors.length} Rechenfehler</span>` : ''}
          ${v.warnings.length > 0 ? `<span class="val-badge val-badge--warn">${v.warnings.length} Widersprüche</span>` : ''}
          ${v.info.length > 0     ? `<span class="val-badge val-badge--info">${v.info.length} Hinweise</span>` : ''}
        </span>
      </div>`;

    if (v.errors.length > 0) {
      html += `<div class="val-section">`;
      for (const e of v.errors) {
        html += `
          <div class="val-item val-item--error">
            <div class="val-item-label">❌ ${escapeHtml(e.label)}</div>
            <div class="val-item-detail">
              Angegeben: <strong>${escapeHtml(e.reported)}</strong> &nbsp;→&nbsp;
              Korrekt: <strong class="val-correct">${escapeHtml(e.correct)}</strong>
            </div>
            <div class="val-item-reason">${escapeHtml(e.reason)}</div>
          </div>`;
      }
      html += `</div>`;
    }

    if (v.warnings.length > 0) {
      html += `<div class="val-section">`;
      for (const w of v.warnings) {
        html += `<div class="val-item val-item--warn">⚠ ${escapeHtml(w)}</div>`;
      }
      html += `</div>`;
    }

    if (v.info.length > 0) {
      html += `<div class="val-section">`;
      for (const i of v.info) {
        html += `<div class="val-item val-item--info">ℹ ${escapeHtml(i)}</div>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
    el.innerHTML  = html;
    el.classList.remove('hidden');
  }

  // ── Report Parser ─────────────────────────────────────────────────────────
  function parseAltairReport(content) {
    return {
      convictionScore: extractConvictionScore(content),
      timingSignal:    extractTimingSignal(content),
      positionSize:    extractPositionSize(content),
      verdict:         extractVerdict(content),
      dcfScenarios:    extractDcfScenarios(content),
      snapshotTable:   extractSnapshotTable(content),
      returnsData:     extractReturnsData(content),
    };
  }

  function extractConvictionScore(content) {
    // Patterns: "Conviction Score: 5/7", "Conviction Score: **5**/7", "5/7"
    const patterns = [
      /Conviction Score[:\s*]*(\d)\s*\/\s*7/i,
      /Conviction[:\s*]*(\d)\s*\/\s*7/i,
      /Score[:\s*]*(\d)\s*\/\s*7/i,
    ];
    for (const p of patterns) {
      const m = content.match(p);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  }

  function extractTimingSignal(content) {
    // Look for 🟢 / 🟡 / 🔴 or text patterns
    if (/GRÜNES LICHT|🟢|Grünes Licht|GRÜN/i.test(content)) return 'green';
    if (/GELBES LICHT|🟡|Gelbes Licht|GELB/i.test(content)) return 'yellow';
    if (/ROTES LICHT|🔴|Rotes Licht|ROT/i.test(content)) return 'red';

    // Try to infer from timing block
    const timingMatch = content.match(/Timing[^:]*:\s*(.+)/i);
    if (timingMatch) {
      const t = timingMatch[1].toLowerCase();
      if (t.includes('grün') || t.includes('green')) return 'green';
      if (t.includes('gelb') || t.includes('yellow')) return 'yellow';
      if (t.includes('rot') || t.includes('red')) return 'red';
    }
    return null;
  }

  function extractPositionSize(content) {
    // Try specific dashboard/recommendation lines first (avoid matching the scoring table)
    const m = content.match(/Empfohlene\s+Größe[^:\n]*:\s*([^\n]{2,20})/i)
           || content.match(/Starte\s+mit\s+([0-9]+[–\-][0-9]+%)/i)
           || content.match(/Zielgröße[^:\n]*:\s*([0-9]+[–\-][0-9]+%)/i);
    if (m) return m[1].trim().replace(/\*+/g, '');

    // Derive from conviction score if extractable
    const scoreM = content.match(/Conviction\s+Score[:\s*]*(\d)\s*\/\s*7/i);
    if (scoreM) {
      const score = parseInt(scoreM[1]);
      if (score >= 6) return '8–12%';
      if (score >= 4) return '4–7%';
      if (score >= 2) return '1–3%';
      return 'Nicht kaufen';
    }
    return null;
  }

  function extractVerdict(content) {
    // Fazit is a heading — capture the paragraph(s) that follow it
    const m = content.match(/#{1,3}\s*\d*\.?\s*Fazit[^\n]*\n+([\s\S]{10,300}?)(?=\n#{1,3}|\n---|\n\*\*|$)/i)
           || content.match(/Fazit[:\s]*\n+([\s\S]{10,200}?)(?=\n#{1,3}|\n---|\n\n\n|$)/i)
           || content.match(/Fazit[:\s]+([^\n]{10,120})/i);
    if (m) {
      const t = m[1].toLowerCase();
      if (t.includes('unterbewertet') || t.includes('undervalued') || t.includes('attraktiv')) return { label: 'Unterbewertet', cls: 'verdict--undervalued', text: m[1].trim() };
      if (t.includes('teuer') || t.includes('expensive') || t.includes('overvalued'))           return { label: 'Teuer', cls: 'verdict--expensive', text: m[1].trim() };
      if (t.includes('fair'))                                                                     return { label: 'Fair bewertet', cls: 'verdict--fair', text: m[1].trim() };
      return { label: 'Analyse', cls: '', text: m[1].trim() };
    }
    return null;
  }

  function extractDcfScenarios(content) {
    /**
     * Parse the DCF table:
     * | Szenario | Wachstumsannahme | Fair Value (DCF) | Margin of Safety |
     * |---|---|---|---|
     * | Base Case | 10% | $180 | +20% |
     */
    const scenarios = [];
    const lines = content.split('\n');
    let inDcfTable = false;
    let headers    = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect the DCF table by headers
      if (trimmed.includes('Szenario') && trimmed.includes('Fair Value')) {
        inDcfTable = true;
        headers    = trimmed.split('|').map(c => c.trim()).filter(Boolean);
        continue;
      }
      if (!inDcfTable) continue;

      // Skip separator
      if (/^[\s|:-]+$/.test(trimmed)) continue;

      if (!trimmed.startsWith('|')) {
        inDcfTable = false;
        break;
      }

      const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        const scenario   = cells[0];
        const growth     = cells[1];
        const fairValue  = cells[2];
        const mos        = cells[3] || '';

        const fvNum  = parseFloat(fairValue.replace(/[^0-9.-]/g, ''));
        const mosNum = parseFloat(mos.replace(/[^0-9.-]/g, '')) * (mos.includes('-') ? -1 : 1);

        if (!isNaN(fvNum)) {
          scenarios.push({
            label:     scenario,
            growth:    growth,
            fairValue: fvNum,
            mos:       isNaN(mosNum) ? null : mosNum,
            mosText:   mos,
          });
        }
      }
    }
    return scenarios;
  }

  function extractSnapshotTable(content) {
    /**
     * Find the first markdown table that looks like a financial snapshot
     * and render it as HTML.
     */
    const lines = content.split('\n');
    let inTable   = false;
    let tableLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('|')) {
        inTable = true;
        tableLines.push(trimmed);
      } else if (inTable && tableLines.length > 2) {
        break;
      } else if (inTable) {
        tableLines = [];
        inTable    = false;
      }
    }

    if (tableLines.length < 2) return null;

    // Build HTML table
    let html    = '<table>';
    let isFirst = true;

    for (const row of tableLines) {
      if (/^[\s|:-]+$/.test(row.replace(/\|/g, ''))) continue;
      const cells = row.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
      const tag   = isFirst ? 'th' : 'td';
      html += `<tr>${cells.map(c => `<${tag}>${inlineMarkdown(c)}</${tag}>`).join('')}</tr>`;
      isFirst = false;
    }

    html += '</table>';
    return html;
  }

  function extractReturnsData(content) {
    /**
     * Parse the returns table:
     * | Szenario | Fair Value | Kaufkurs | Rendite 3J | Rendite 5J | p.a. |
     */
    const returns = [];
    const lines   = content.split('\n');
    let inTable   = false;
    let hasHeader = false;
    let colMap    = null; // dynamic column index mapping

    for (const line of lines) {
      const trimmed = line.trim();

      if (!hasHeader && trimmed.includes('Szenario') && (trimmed.includes('3J') || trimmed.includes('3j'))) {
        inTable   = true;
        hasHeader = true;
        // Detect column positions dynamically from header
        const headers = trimmed.split('|').map(c => c.trim()).filter(Boolean);
        colMap = {
          fairValue: headers.findIndex(h => /fair.?value|fair.?wert/i.test(h)),
          kaufkurs:  headers.findIndex(h => /kaufkurs|current.?price|kurs/i.test(h)),
          return3y:  headers.findIndex(h => /3\s*j/i.test(h)),
          return5y:  headers.findIndex(h => /5\s*j/i.test(h)),
          pa:        headers.findIndex(h => /p\.?a\.?/i.test(h)),
        };
        continue;
      }
      if (!inTable) continue;
      if (/^[\s|:-]+$/.test(trimmed.replace(/\|/g, ''))) continue;
      if (!trimmed.startsWith('|')) break;

      const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        const get = (idx) => (idx >= 0 && cells[idx]) ? cells[idx] : '';
        returns.push({
          scenario:  cells[0],
          fairValue: colMap ? get(colMap.fairValue) : '',
          kaufkurs:  colMap ? get(colMap.kaufkurs)  : '',
          return3y:  colMap ? get(colMap.return3y)  : (cells[3] || ''),
          return5y:  colMap ? get(colMap.return5y)  : (cells[4] || ''),
          pa:        colMap ? get(colMap.pa)         : (cells[5] || ''),
        });
      }
    }
    return returns;
  }

  // ── Conviction Gauge (Chart.js doughnut approximation) ───────────────────
  function renderConvictionGauge(score) {
    const valueEl = document.getElementById('convictionValue');
    const canvas  = document.getElementById('convictionGauge');
    const ctx     = canvas.getContext('2d');

    if (score === null || score === undefined) {
      valueEl.textContent = '—/7';
      return;
    }

    valueEl.textContent = `${score}/7`;

    const pct     = score / 7;
    const color   = pct >= 0.7 ? '#00ff88' : pct >= 0.43 ? '#ffaa00' : '#ff3366';
    const bgColor = '#1e2040';

    // Destroy previous instance
    if (convictionChart) {
      convictionChart.destroy();
      convictionChart = null;
    }

    convictionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [score, 7 - score],
          backgroundColor: [color, bgColor],
          borderColor: ['transparent', 'transparent'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
        }],
      },
      options: {
        responsive: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        animation: { duration: 800, easing: 'easeOutCubic' },
      },
    });
  }

  // ── Timing Signal ─────────────────────────────────────────────────────────
  function renderTimingSignal(signal) {
    const dotEl  = document.querySelector('#timingSignal .signal-dot');
    const textEl = document.querySelector('#timingSignal .signal-text');
    if (!dotEl || !textEl) return;

    const map = {
      green:  { cls: 'signal-dot--green',  label: 'GRÜNES LICHT',  color: '#00ff88' },
      yellow: { cls: 'signal-dot--yellow', label: 'GELBES LICHT',  color: '#ffaa00' },
      red:    { cls: 'signal-dot--red',    label: 'ROTES LICHT',   color: '#ff3366' },
    };

    const cfg = signal ? map[signal] : null;
    dotEl.className  = `signal-dot ${cfg ? cfg.cls : 'signal-dot--gray'}`;
    textEl.textContent = cfg ? cfg.label : '—';
    textEl.style.color = cfg ? cfg.color : 'var(--text-dim)';
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  function renderVerdict(verdict) {
    const el     = document.getElementById('altairVerdict');
    const textEl = document.getElementById('altairVerdictText');
    if (!verdict) {
      el.textContent = '—';
      el.className   = 'verdict';
      if (textEl) textEl.textContent = '';
      return;
    }
    el.textContent = verdict.label;
    el.className   = `verdict ${verdict.cls}`;
    if (textEl && verdict.text) {
      // Show first 2 sentences of Fazit text below the badge
      const sentences = verdict.text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/);
      textEl.textContent = sentences.slice(0, 2).join(' ');
    }
  }

  // ── DCF Bar Chart ─────────────────────────────────────────────────────────
  function renderDcfChart(scenarios, ticker) {
    const canvas = document.getElementById('dcfChart');
    const ctx    = canvas.getContext('2d');

    if (dcfChart) { dcfChart.destroy(); dcfChart = null; }

    const colors = scenarios.map((_, i) => {
      const palette = ['#00d4ff', '#ffaa00', '#ff3366', '#00ff88'];
      return palette[i % palette.length];
    });

    dcfChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: scenarios.map(s => s.label),
        datasets: [{
          label: 'Fair Value (DCF)',
          data: scenarios.map(s => s.fairValue),
          backgroundColor: colors.map(c => c + '33'),
          borderColor:     colors,
          borderWidth:     1.5,
          borderRadius:    4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const idx = ctx.dataIndex;
                const s   = scenarios[idx];
                return [
                  `Fair Value: $${ctx.raw.toFixed(2)}`,
                  s.mosText ? `MoS: ${s.mosText}` : '',
                  s.growth  ? `CAGR: ${s.growth}` : '',
                ].filter(Boolean);
              },
            },
          },
        },
        scales: {
          y: {
            grid: { color: '#151530' },
            ticks: {
              callback: (v) => `$${v}`,
              color: '#7080a0',
            },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#7080a0' },
          },
        },
      },
    });
  }

  // ── Returns Table ─────────────────────────────────────────────────────────
  function renderReturnsTable(returns) {
    const container = document.getElementById('altairReturnsTable');
    if (!returns.length) { container.innerHTML = ''; return; }

    // Determine if we have fairValue/kaufkurs columns to show
    const hasExtra = returns.some(r => r.fairValue || r.kaufkurs);
    const headers  = hasExtra
      ? ['Szenario', 'Fair Value', 'Kaufkurs', 'Rendite 3J', 'Rendite 5J', 'p.a.']
      : ['Szenario', 'Rendite 3J', 'Rendite 5J', 'p.a.'];

    let html = '<table><thead><tr>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';

    returns.forEach(row => {
      const isBase  = row.scenario.toLowerCase().includes('base');
      const isWorst = row.scenario.toLowerCase().includes('worst');
      const cls     = isBase ? '' : isWorst ? 'td-negative' : 'td-positive';
      const r3  = row.return3y || '—';
      const r5  = row.return5y || '—';
      const pa  = row.pa       || '—';
      if (hasExtra) {
        html += `<tr>
          <td>${escapeHtml(row.scenario)}</td>
          <td class="td-number">${escapeHtml(row.fairValue || '—')}</td>
          <td class="td-number">${escapeHtml(row.kaufkurs  || '—')}</td>
          <td class="td-number ${cls}">${escapeHtml(r3)}</td>
          <td class="td-number ${cls}">${escapeHtml(r5)}</td>
          <td class="td-number ${cls}">${escapeHtml(pa)}</td>
        </tr>`;
      } else {
        html += `<tr>
          <td>${escapeHtml(row.scenario)}</td>
          <td class="td-number ${cls}">${escapeHtml(r3)}</td>
          <td class="td-number ${cls}">${escapeHtml(r5)}</td>
          <td class="td-number ${cls}">${escapeHtml(pa)}</td>
        </tr>`;
      }
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // ── Returns Line Chart ────────────────────────────────────────────────────
  function renderReturnsChart(returns) {
    const canvas = document.getElementById('returnsChart');
    const ctx    = canvas.getContext('2d');

    if (returnsChart) { returnsChart.destroy(); returnsChart = null; }

    // Convert return strings to numbers
    const toNum = (str) => {
      if (!str) return null;
      const n = parseFloat(str.replace(/[^0-9.-]/g, ''));
      return isNaN(n) ? null : n;
    };

    const labels   = ['0J', '3J', '5J'];
    const colors   = ['#00d4ff', '#ffaa00', '#ff3366', '#00ff88'];
    const datasets = returns.map((row, i) => {
      const r3 = toNum(row.return3y);
      const r5 = toNum(row.return5y);
      return {
        label:            row.scenario,
        data:             [0, r3, r5].filter((v, idx) => v !== null || idx === 0),
        borderColor:      colors[i % colors.length],
        backgroundColor:  colors[i % colors.length] + '20',
        pointRadius:      4,
        tension:          0.3,
        fill:             false,
      };
    });

    returnsChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#7080a0', boxWidth: 12 },
          },
        },
        scales: {
          y: {
            grid: { color: '#151530' },
            ticks: { callback: v => `${v}%`, color: '#7080a0' },
          },
          x: { grid: { display: false }, ticks: { color: '#7080a0' } },
        },
      },
    });
  }

  // ── Sources Renderer ──────────────────────────────────────────────────────
  function renderSources(sources) {
    const el = document.getElementById('altairSourcesList');
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
      a.textContent = (title || url).slice(0, 50) + (title.length > 50 ? '…' : '');
      el.appendChild(a);
    });
  }

  // ── Klumpenrisiko Check ───────────────────────────────────────────────────
  function checkKlumpenrisiko(ticker, convictionScore) {
    const positions = NEXUS.portfolioPositions || [];
    const warningEl = document.getElementById('altairKlumpenWarning');
    const textEl    = document.getElementById('altairKlumpenText');

    if (!positions.length) { warningEl.classList.add('hidden'); return; }

    // Find if ticker is already in portfolio
    const existing = positions.find(p => p.ticker.toUpperCase() === ticker.toUpperCase());

    if (existing) {
      warningEl.classList.remove('hidden');
      textEl.textContent = `⚠ ${ticker} ist bereits in Ihrem Portfolio (${
        existing.weight ? existing.weight.toFixed(1) + '%' : '—'
      } Gewichtung). Eine zusätzliche Position würde die Konzentration erhöhen.`;
    } else {
      warningEl.classList.add('hidden');
    }
  }

  // ── Expose for cross-module use ───────────────────────────────────────────
  function prefillTicker(ticker) {
    document.getElementById('altairTicker').value = ticker.toUpperCase();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return { init, prefillTicker, forceRefresh: handleForceRefresh };

})();

document.addEventListener('DOMContentLoaded', () => altairModule.init());
