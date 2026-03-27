# NEXUS Investment Suite — Architecture Document

## Overview

NEXUS is a local, self-hosted investment research platform combining AI-powered stock screening (Elara), deep-dive analysis (Altair), and portfolio management. It runs entirely on the user's machine, using a persistent Playwright browser session to leverage the user's Perplexity Pro subscription for deep research.

---

## Technology Stack

### Backend
| Component | Technology | Rationale |
|---|---|---|
| Web Framework | FastAPI (Python 3.10+) | Async-first, type-safe, excellent WebSocket support, auto-generates OpenAPI docs |
| ASGI Server | Uvicorn | Fast, production-grade ASGI server; plays well with FastAPI |
| Browser Automation | Playwright (async) | Reliable cross-browser automation; persistent context support for session preservation |
| Database | SQLite (python stdlib) | Zero-config, file-based, sufficient for personal portfolio scale |
| Data Validation | Pydantic v2 | First-class FastAPI integration, fast validation, JSON serialization |
| File I/O | aiofiles | Non-blocking file operations in async context |

### Frontend
| Component | Technology | Rationale |
|---|---|---|
| UI Framework | Vanilla HTML/CSS/JS | Zero dependencies, maximum performance, full control, no build step |
| Charts | Chart.js (local) | Industry standard, feature-rich, works offline (downloaded at setup) |
| Transport | REST + WebSockets | REST for CRUD; WebSockets for real-time progress streaming |
| Styling | Custom CSS (Bloomberg Terminal aesthetic) | No framework overhead; custom terminal aesthetic not easily achievable with frameworks |

---

## Directory Structure

```
nexus-investment-suite/
├── ARCHITECTURE.md         ← This document
├── README.md               ← User-facing documentation
├── .gitignore              ← Excludes data, sessions, vendor files
├── start.bat               ← One-click launcher (Windows)
├── setup_session.bat       ← One-time Perplexity login setup
├── backend/
│   ├── main.py             ← FastAPI application, routes, WebSocket manager
│   ├── playwright_service.py ← Perplexity automation core
│   ├── database.py         ← SQLite operations
│   ├── models.py           ← Pydantic request/response models
│   └── requirements.txt    ← Python dependencies
├── frontend/
│   ├── index.html          ← Single-page application shell
│   ├── css/styles.css      ← Bloomberg Terminal aesthetic
│   ├── js/
│   │   ├── app.js          ← Core: tabs, WebSocket, state, utilities
│   │   ├── elara.js        ← Elara Screener module
│   │   ├── altair.js       ← Altair Deep Dive module
│   │   └── portfolio.js    ← Portfolio management module
│   └── vendor/
│       └── chart.min.js    ← Chart.js (downloaded at setup, not committed)
├── data/                   ← SQLite DB (gitignored)
├── sessions/               ← Playwright browser session (gitignored)
└── scripts/
    ├── setup_session.py    ← CLI helper for session initialization
    └── download_vendors.py ← Downloads Chart.js for offline use
```

---

## Component Responsibilities

### `backend/main.py` — Application Core
- Initializes FastAPI app with lifespan management (DB init + Playwright init/close)
- Manages WebSocket connections for streaming progress to the frontend
- Serves the frontend static files and `index.html`
- Defines all API routes
- Contains the Elara and Altair system prompts
- Orchestrates Playwright calls for research operations

### `backend/playwright_service.py` — Perplexity Automation Engine
- Manages a persistent Playwright browser context stored in `sessions/perplexity_session/`
- Provides `run_deep_research(prompt, progress_callback)`: full Deep Research automation
- Provides `get_stock_price(ticker)`: lightweight price lookup
- Provides `setup_session()`: interactive browser for one-time login
- Handles session expiry, reconnection, and error recovery

### `backend/database.py` — Data Persistence Layer
- All SQLite operations via Python's stdlib `sqlite3`
- Tables: `positions`, `altair_reports`, `elara_results`
- Synchronous operations (SQLite doesn't benefit from async in practice)
- Path resolution via `pathlib` relative to project root

### `backend/models.py` — Data Contracts
- Pydantic v2 models for all API requests and responses
- Validates incoming data and serializes outgoing data
- Provides clear contracts between frontend and backend

### `frontend/js/app.js` — Frontend Core
- Tab navigation state machine
- WebSocket lifecycle management (connect, receive, reconnect)
- Global state store
- Shared utilities: number formatting, date formatting, toast notifications
- Cross-module communication (e.g., Elara → Altair ticker handoff)

### `frontend/js/elara.js` — Elara Screener UI
- Manages Elara form and submission
- Renders Deep Research progress with elapsed timer
- Parses markdown tables from Perplexity responses into interactive HTML tables
- Clickable tickers trigger Altair tab pre-fill

### `frontend/js/altair.js` — Altair Deep Dive UI
- Manages Altair form and submission
- Parses structured sections from the Altair report
- Renders DCF scenarios as Chart.js bar chart
- Renders Conviction Score as animated gauge
- Renders Timing Signal as colored indicator
- Displays Abschluss-Dashboard as styled widget
- PDF export via `window.print()` with dedicated print stylesheet

### `frontend/js/portfolio.js` — Portfolio Management UI
- Full CRUD for positions via REST API
- Real-time P&L calculation (entry price vs current price)
- Performance chart (portfolio vs S&P500 vs MSCI World)
- Klumpenrisiko (concentration risk) warnings
- Timeframe filtering for performance chart

---

## Data Flow

### Elara Screening Flow
```
User fills sector form
    │
    ▼
frontend/js/elara.js
    │  1. Generate session_id (UUID)
    │  2. Open WebSocket ws://{host}/ws/{session_id}
    │  3. POST /api/elara/screen {sector, filters, session_id}
    │
    ▼
backend/main.py (async endpoint)
    │  4. Build full Elara prompt from system prompt + sector
    │  5. Start background task: playwright_service.run_deep_research(prompt)
    │  6. Background task calls progress_callback → send via WebSocket
    │  7. Return final result JSON
    │
    ▼
backend/playwright_service.py
    │  8. Navigate to perplexity.ai
    │  9. Enable Deep Research mode
    │  10. Type and submit prompt
    │  11. Poll every 5s for completion (max 5min)
    │  12. Extract response text and sources
    │
    ▼
frontend/js/elara.js
    │  13. Receive progress via WebSocket (update status bar)
    │  14. Receive final result from POST response
    │  15. Parse markdown table → render HTML table
    │  16. Display sector champion and notes
```

### Altair Analysis Flow
```
User enters ticker (or clicks from Elara)
    │
    ▼
frontend/js/altair.js
    │  1. Same WebSocket + POST pattern as Elara
    │  2. POST /api/altair/analyze {ticker, session_id}
    │
    ▼
backend/main.py → playwright_service.run_deep_research(prompt)
    │  3. Same Playwright automation as Elara
    │
    ▼
frontend/js/altair.js
    │  4. Parse report sections (regex + markdown parsing)
    │  5. Render:
    │     - Finanz-Snapshot table
    │     - DCF scenarios bar chart (Chart.js)
    │     - Conviction Score gauge
    │     - Timing Signal indicator
    │     - Returns table
    │     - Pre-Mortem section
    │     - Abschluss-Dashboard widget
```

### Portfolio Flow
```
User adds position
    │
    ▼
POST /api/portfolio/position → database.add_position()
    │
    ▼
GET /api/portfolio → database.get_all_positions()
    │  Calculates P&L: (current_price - entry_price) * shares
    │  Calculates weight: position_value / total_portfolio_value
    │
    ▼
frontend/js/portfolio.js
    │  Renders positions table with P&L color coding
    │  Renders Chart.js performance chart
    │  Checks Klumpenrisiko thresholds:
    │    - Sector > 30% → warning
    │    - Region > 50% → warning
```

### Price Refresh Flow
```
User clicks "Refresh Prices"
    │
    ▼
POST /api/portfolio/refresh-prices
    │  For each position: playwright_service.get_stock_price(ticker)
    │  Update database with new current_price
    │
    ▼
Return updated positions list
```

---

## Session Management

The Perplexity session is stored as a Playwright persistent browser context in `sessions/perplexity_session/`. This directory contains browser profile data (cookies, localStorage, etc.) that keeps the user logged in.

**Setup**: Run `setup_session.bat` once → opens a browser → user logs in → session saved.

**Persistence**: The session directory is gitignored and machine-local. It survives server restarts.

**Expiry Handling**: If Perplexity's session expires, `run_deep_research()` detects the login page and returns an error instructing the user to re-run `setup_session.bat`.

---

## WebSocket Protocol

### Message Format (Server → Client)
```json
{
  "type": "progress",
  "session_id": "uuid",
  "status": "running",
  "message": "Deep Research läuft... (45s)",
  "elapsed": 45
}
```

```json
{
  "type": "complete",
  "session_id": "uuid",
  "status": "done"
}
```

```json
{
  "type": "error",
  "session_id": "uuid",
  "message": "Session expired. Please run setup_session.bat"
}
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Serve frontend SPA |
| GET | `/static/{path}` | Serve static frontend assets |
| WS | `/ws/{session_id}` | WebSocket progress channel |
| POST | `/api/elara/screen` | Run Elara sector screening |
| POST | `/api/altair/analyze` | Run Altair deep analysis |
| GET | `/api/portfolio` | Get all positions with P&L |
| POST | `/api/portfolio/position` | Add new position |
| PUT | `/api/portfolio/position/{id}` | Update position |
| DELETE | `/api/portfolio/position/{id}` | Delete position |
| POST | `/api/portfolio/refresh-prices` | Refresh all prices via Perplexity |
| GET | `/api/portfolio/performance` | Get performance vs benchmarks |

---

## Security Considerations

- **Local-only**: The server binds to `127.0.0.1` only — not accessible from network
- **No API keys**: Uses browser session authentication (user's own Perplexity account)
- **No external calls**: After setup, all data stays local (except Perplexity queries the user initiates)
- **SQLite**: No network-accessible database

---

## Design Decisions

### Why SQLite instead of PostgreSQL?
Personal portfolio management doesn't require concurrent write access or large-scale data. SQLite is zero-config, file-portable, and perfectly adequate for hundreds to thousands of positions.

### Why Playwright instead of an API?
Perplexity doesn't offer a public Deep Research API. The only way to leverage a Pro subscription's Deep Research feature programmatically is through browser automation. Playwright provides the most reliable and maintainable approach for this.

### Why Vanilla JS instead of React/Vue?
- No build toolchain required
- Works offline after initial setup
- Faster initial load
- No dependency management surprises
- The Bloomberg Terminal aesthetic is easier to implement with direct DOM control

### Why no CDN dependencies?
- Works without internet after initial vendor download
- Consistent behavior (no CDN outages)
- Predictable versioning

### Why local Chart.js instead of another chart library?
Chart.js is mature, well-documented, and provides all needed chart types (line, bar, doughnut/gauge approximation) with a reasonable bundle size.
