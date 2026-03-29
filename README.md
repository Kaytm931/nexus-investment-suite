# NEXUS Investment Suite

**AI-powered investment research platform — running 100% locally on your machine.**

NEXUS combines three tools in one Bloomberg Terminal-style interface:

- **ELARA SCREENER** — Quantamental sector screening: identifies the ~30 most relevant stocks in any sector, ranked by a proprietary score, using live data from Perplexity Deep Research.
- **ALTAIR DEEP DIVE** — Full DCF valuation, Conviction Score, Timing Signal, and Capital Allocation recommendations for individual stocks and ETFs.
- **PORTFOLIO** — Track your positions, monitor P&L, visualize performance vs. S&P 500 and MSCI World, and get automatic Klumpenrisiko (concentration risk) warnings.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.10 or higher | [python.org](https://python.org) — check "Add to PATH" |
| pip | Any recent | Included with Python |
| Perplexity Pro | Active subscription | Required for Deep Research |
| Operating System | Windows | .bat scripts are Windows-only; Python code is cross-platform |
| Internet | For setup | Only needed for first setup + Perplexity queries |

---

## One-Time Setup (Run Once)

### Step 1 — Log in to Perplexity

Double-click **`setup_session.bat`** and follow the on-screen instructions:

1. A browser window opens with Perplexity.ai
2. Log in with your Perplexity **Pro** account
3. Confirm that "Deep Research" is available in the UI
4. Return to the command window and press **ENTER**
5. Your session is saved to `sessions/perplexity_session/`

> The session is saved locally and survives restarts. You only need to re-run this if your Perplexity session expires (typically every few weeks).

### Step 2 — That's it!

The first time you run `start.bat`, it will automatically:
- Install all Python packages (`pip install -r backend/requirements.txt`)
- Install the Playwright Chromium browser
- Download Chart.js for offline use

---

## Daily Usage

Double-click **`start.bat`**.

NEXUS will:
1. Verify prerequisites
2. Start the FastAPI backend on `http://127.0.0.1:7842`
3. Open your browser automatically

**Close the `start.bat` window** to stop the server.

---

## How to Use Each Module

### ELARA SCREENER
1. Enter a **sector or theme** (e.g., "Cloud Computing", "Renewable Energy", "European Banks")
2. Optionally set filters: minimum market cap, geographic region, tickers to exclude, investment horizon
3. Click **SCREENING STARTEN**
4. Wait 2–5 minutes for Perplexity Deep Research to complete
5. View the ranked table of ~30 stocks with sector-specific metrics and Elara Score
6. Click any ticker to jump directly to an Altair Deep Dive

Results are cached for 24 hours — repeat queries for the same sector are instant.

### ALTAIR DEEP DIVE
1. Enter a **ticker** (e.g., `AAPL`, `MSFT`) or **ETF ISIN** (e.g., `IE00B4L5Y983`)
2. Click **ANALYSE STARTEN**
3. Wait 2–5 minutes for the analysis
4. Review:
   - **Conviction Score (0–7)**: Higher = stronger investment case
   - **Timing Signal**: 🟢 Green Light / 🟡 Yellow / 🔴 Red
   - **DCF Scenarios**: Fair value under Base, Worst, Bull case assumptions
   - **Returns Expectation**: 3-year and 5-year projected returns vs. benchmarks
   - **Pre-Mortem**: What could go wrong by 2030?
   - **Capital Allocation Dashboard**: Recommended position size and entry price
5. Click **⎙ PDF Export** to save the report

Reports are cached for 7 days.

### PORTFOLIO
1. Click **+ Position hinzufügen** to add a position
2. Fill in: Ticker, Name, Purchase Price, Shares, Purchase Date, Sector, Region
3. The portfolio table shows real-time P&L (using the price you entered or the last refreshed price)
4. Click **↻ Preise aktualisieren** to refresh all current prices via Perplexity (takes a few minutes)
5. Use timeframe buttons (1M / 3M / 6M / 1J / Gesamt) to filter the performance chart
6. **Klumpenrisiko warnings** appear automatically if:
   - Any sector exceeds 30% of portfolio
   - Any region exceeds 50% of portfolio
7. Click any ticker to jump to an Altair analysis

---

## Cloud Deployment

### Backend → Render.com

The backend can be deployed as a free web service on Render.com so that portfolio data persists in Supabase instead of an ephemeral local SQLite file.

**Step 1 — Supabase: run the current_price migration**

Open the Supabase SQL Editor and run:
```sql
ALTER TABLE positions ADD COLUMN IF NOT EXISTS current_price numeric(18, 4);
```

**Step 2 — Supabase: disable email confirmations (Beta)**

`Supabase Dashboard → Authentication → Providers → Email → "Enable email confirmations" → OFF → Save`

This lets users log in immediately after registration without needing to confirm their email.

**Step 3 — Render.com: deploy the backend**

1. Create a free account at [render.com](https://render.com)
2. Click **New → Web Service** → connect your GitHub repo (`Kaytm931/nexus-investment-suite`)
3. Render will detect `render.yaml` automatically and pre-fill the settings
4. Set the following **Environment Variables** (under Settings → Environment):

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → service_role key |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) |
| `ENCRYPTION_KEY` | Run: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |

5. Click **Create Web Service** — Render builds and deploys automatically
6. After deploy, Render shows a URL like `https://nexus-backend.onrender.com`

**Step 4 — Vercel: update the API URL**

In your Vercel project settings → Environment Variables:
```
VITE_API_BASE = https://nexus-backend.onrender.com
```
Redeploy the frontend for the change to take effect.

> **Note:** The free Render tier spins down after 15 minutes of inactivity (cold start ~30s on first request). Upgrade to the Starter plan ($7/month) to avoid this.

> **Note:** Ollama (local LLM) is not available on Render. Set `OLLAMA_BASE_URL` to a remote Ollama instance or use Claude API (BYOK) instead.

---

## Architecture Overview

```
NEXUS Investment Suite
│
├── Frontend (Vanilla HTML/CSS/JS)
│   ├── Single-page app served by FastAPI at /
│   ├── Bloomberg Terminal dark aesthetic
│   ├── Three modules: Elara / Altair / Portfolio
│   └── Chart.js for visualizations (downloaded locally at setup)
│
├── Backend (FastAPI / Python)
│   ├── REST API + WebSocket (for progress streaming)
│   ├── Playwright automation (→ Perplexity Deep Research)
│   └── SQLite database (portfolio, cached reports)
│
└── Sessions (gitignored)
    └── Playwright persistent browser context
        (keeps Perplexity login across restarts)
```

See `ARCHITECTURE.md` for full technical details.

---

## API Documentation

### Authentication
No authentication required — the server binds to `127.0.0.1` only (localhost).

### Base URL
```
http://127.0.0.1:7842
```

### WebSocket
```
ws://127.0.0.1:7842/ws/{session_id}
```

Connect before submitting a research request. The backend will send progress messages to this channel during Deep Research.

**Progress Message Format:**
```json
{
  "type": "progress",
  "session_id": "uuid",
  "status": "running",
  "message": "Deep Research läuft... (45s)",
  "elapsed": 45
}
```

---

### POST `/api/elara/screen`

Run Elara sector screening.

**Request Body:**
```json
{
  "sector": "Cloud Computing",
  "session_id": "uuid-v4",
  "filters": {
    "min_market_cap": 1.0,
    "region": "USA",
    "exclusions": "TSLA, Meta",
    "horizon": "3-5 Jahre"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sector": "Cloud Computing",
  "raw_content": "# Elara Screening...\n| # | Ticker | ...",
  "sources": ["https://...", "https://..."],
  "cached": false
}
```

**JavaScript Example:**
```javascript
// Connect WebSocket first for progress updates
const sessionId = crypto.randomUUID();
const ws = new WebSocket(`ws://127.0.0.1:7842/ws/${sessionId}`);
ws.onmessage = (e) => console.log(JSON.parse(e.data).message);

// Submit screening
const resp = await fetch('http://127.0.0.1:7842/api/elara/screen', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sector: 'Cloud Computing', session_id: sessionId })
});
const data = await resp.json();
console.log(data.raw_content);
```

**Python Example:**
```python
import httpx, asyncio

async def screen(sector: str):
    async with httpx.AsyncClient(timeout=400) as client:
        resp = await client.post(
            "http://127.0.0.1:7842/api/elara/screen",
            json={"sector": sector, "session_id": "test-session"}
        )
        return resp.json()

result = asyncio.run(screen("Cloud Computing"))
print(result["raw_content"])
```

**curl Example:**
```bash
curl -X POST http://127.0.0.1:7842/api/elara/screen \
  -H "Content-Type: application/json" \
  -d '{"sector": "Cloud Computing", "session_id": "test-123"}'
```

---

### POST `/api/altair/analyze`

Run Altair deep analysis for a stock or ETF.

**Request Body:**
```json
{
  "ticker": "AAPL",
  "session_id": "uuid-v4"
}
```

**Response:**
```json
{
  "success": true,
  "ticker": "AAPL",
  "raw_content": "# Altair Analysis — AAPL\n...",
  "sources": ["https://...", "https://..."],
  "cached": false
}
```

**JavaScript Example:**
```javascript
const sessionId = crypto.randomUUID();
const ws = new WebSocket(`ws://127.0.0.1:7842/ws/${sessionId}`);
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  console.log(`[${msg.elapsed}s] ${msg.message}`);
};

const resp = await fetch('http://127.0.0.1:7842/api/altair/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ticker: 'AAPL', session_id: sessionId })
});
const data = await resp.json();
console.log(data.raw_content);
```

**Python Example:**
```python
import httpx, asyncio

async def analyze(ticker: str):
    async with httpx.AsyncClient(timeout=400) as client:
        resp = await client.post(
            "http://127.0.0.1:7842/api/altair/analyze",
            json={"ticker": ticker, "session_id": "test-session"}
        )
        return resp.json()

result = asyncio.run(analyze("AAPL"))
print(result["raw_content"])
```

**curl Example:**
```bash
curl -X POST http://127.0.0.1:7842/api/altair/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL", "session_id": "test-123"}'
```

---

### GET `/api/portfolio`

Get all portfolio positions with calculated P&L and weights.

**Response:**
```json
[
  {
    "id": 1,
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "entry_price": 150.00,
    "current_price": 185.50,
    "shares": 10,
    "purchase_date": "2023-01-15",
    "sector": "Technology",
    "region": "USA",
    "pnl": 355.00,
    "pnl_pct": 23.67,
    "weight": 45.2,
    "cost_basis": 1500.00,
    "current_value": 1855.00
  }
]
```

**Python Example:**
```python
import httpx

with httpx.Client() as client:
    resp = client.get("http://127.0.0.1:7842/api/portfolio")
    positions = resp.json()
    for pos in positions:
        print(f"{pos['ticker']}: {pos['pnl_pct']:+.1f}% ({pos['weight']:.1f}% of portfolio)")
```

---

### POST `/api/portfolio/position`

Add a new portfolio position.

**Request Body:**
```json
{
  "ticker": "AAPL",
  "name": "Apple Inc.",
  "entry_price": 150.00,
  "shares": 10,
  "purchase_date": "2023-01-15",
  "sector": "Technology",
  "region": "USA"
}
```

**curl Example:**
```bash
curl -X POST http://127.0.0.1:7842/api/portfolio/position \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "entry_price": 150.00,
    "shares": 10,
    "purchase_date": "2023-01-15",
    "sector": "Technology",
    "region": "USA"
  }'
```

---

### PUT `/api/portfolio/position/{id}`

Update an existing position. All fields optional.

**curl Example:**
```bash
curl -X PUT http://127.0.0.1:7842/api/portfolio/position/1 \
  -H "Content-Type: application/json" \
  -d '{"current_price": 190.00}'
```

---

### DELETE `/api/portfolio/position/{id}`

Delete a position.

**curl Example:**
```bash
curl -X DELETE http://127.0.0.1:7842/api/portfolio/position/1
```

---

### POST `/api/portfolio/refresh-prices`

Refresh current prices for all positions via Perplexity. May take several minutes for large portfolios.

**Response:**
```json
{
  "updated": 8,
  "failed": 1,
  "errors": ["SOME_OBSCURE_TICKER: Price not found"],
  "positions": [ ... ]
}
```

---

### GET `/api/portfolio/performance`

Get time-series performance data vs. S&P 500 and MSCI World (indexed to 100).

**Response:**
```json
{
  "dates": ["2023-01-01", "2023-02-01", ...],
  "portfolio_values": [100.0, 103.2, 107.8, ...],
  "sp500_values": [100.0, 101.8, 103.7, ...],
  "msci_values": [100.0, 101.4, 102.9, ...],
  "total_return_pct": 23.5,
  "sp500_return_pct": 18.2,
  "msci_return_pct": 12.4,
  "alpha_vs_sp500": 5.3,
  "alpha_vs_msci": 11.1
}
```

---

### GET `/api/health`

Quick health check.

**Response:**
```json
{
  "status": "ok",
  "perplexity_session": true,
  "playwright_ready": true
}
```

---

## Troubleshooting

### "Session fehlt" in the status bar
Run `setup_session.bat` to log in to Perplexity.

### Deep Research returns an error about expired session
Run `setup_session.bat` again to refresh your Perplexity login.

### Backend fails to start (port in use)
Another process is using port 7842. Find and close it, or change the port in `start.bat` (update both the uvicorn command AND the browser open URL).

### Chart.js missing / charts not working
Run `python scripts/download_vendors.py` to re-download Chart.js.

### Requirements failed to install
Run manually from the project root:
```
pip install -r backend\requirements.txt
python -m playwright install chromium
```

### Prices not refreshing
Perplexity's page may have changed its layout. The price parser uses regex heuristics — it may miss some formats. You can always manually enter the current price in the "Edit" dialog for any position.

---

## Data Privacy

- **All data stays local.** Your portfolio, API responses, and session cookies are stored only on your machine.
- **No telemetry.** NEXUS does not send any data to external servers (other than the Perplexity queries you explicitly initiate).
- The `sessions/` folder contains your Perplexity login cookies. Keep it private and do not share it.

---

## License

MIT License — see LICENSE file.

---

*NEXUS is not a financial advisor. All analysis is for informational purposes only. Past performance does not guarantee future results.*
