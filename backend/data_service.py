"""
NEXUS Investment Suite — Enhanced Data Service
Tri-layer: yfinance (primary) → Alpha Vantage (fallback) → cache
"""

import asyncio
import os
import time
import httpx
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
import yfinance as yf

# ── In-process cache ────────────────────────────────────────────────────────

_cache: dict[str, tuple[dict, float]] = {}  # key → (data, unix_timestamp)

CACHE_TTL = {
    "fundamentals": 24 * 3600,   # 24 h
    "price":        15 * 60,     # 15 min
    "history":      3600,        # 1 h
    "benchmark":    3600,        # 1 h
    "search":       6 * 3600,    # 6 h
}

_executor = ThreadPoolExecutor(max_workers=8)

EXCHANGE_SUFFIXES = [".DE", ".PA", ".L", ".MI", ".SW", ".AS", ".TO", ".AX", ".HK", ".T", ".F"]

# ── Alpha Vantage (fallback) ─────────────────────────────────────────────────

AV_BASE = "https://www.alphavantage.co/query"


async def _alpha_vantage_quote(symbol: str, av_key: str) -> Optional[dict]:
    """Fetch a quote from Alpha Vantage (used as fallback only)."""
    if not av_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(AV_BASE, params={
                "function": "GLOBAL_QUOTE",
                "symbol": symbol,
                "apikey": av_key,
            })
            data = r.json()
            q = data.get("Global Quote", {})
            if not q:
                return None
            return {
                "current_price": float(q.get("05. price", 0) or 0) or None,
                "previous_close": float(q.get("08. previous close", 0) or 0) or None,
                "change_pct": q.get("10. change percent", "0%").replace("%", ""),
                "_source": "alpha_vantage",
            }
    except Exception:
        return None


# ── yfinance sync helpers ────────────────────────────────────────────────────

def _is_valid_info(info: dict) -> bool:
    return bool(
        info.get("regularMarketPrice")
        or info.get("currentPrice")
        or info.get("previousClose")
    )


def _build_stock_data(ticker_str: str, info: dict) -> dict:
    total_debt = info.get("totalDebt") or 0
    cash = info.get("totalCash") or 0
    ebitda = info.get("ebitda") or 1
    nd_ebitda = round((total_debt - cash) / ebitda, 2) if ebitda else None

    return {
        "symbol":           info.get("symbol", ticker_str),
        "name":             info.get("longName") or info.get("shortName", ticker_str),
        "sector":           info.get("sector"),
        "industry":         info.get("industry"),
        "country":          info.get("country"),
        "currency":         info.get("currency", "USD"),
        "quote_type":       info.get("quoteType", "EQUITY"),
        # Price
        "current_price":    info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose"),
        "previous_close":   info.get("previousClose"),
        "52w_high":         info.get("fiftyTwoWeekHigh"),
        "52w_low":          info.get("fiftyTwoWeekLow"),
        # Valuation
        "market_cap":       info.get("marketCap"),
        "enterprise_value": info.get("enterpriseValue"),
        "pe_ttm":           info.get("trailingPE"),
        "pe_forward":       info.get("forwardPE"),
        "ev_ebitda":        info.get("enterpriseToEbitda"),
        "ev_revenue":       info.get("enterpriseToRevenue"),
        "pb_ratio":         info.get("priceToBook"),
        "ps_ratio":         info.get("priceToSalesTrailing12Months"),
        "peg_ratio":        info.get("trailingPegRatio") or info.get("pegRatio"),
        # Quality
        "gross_margin":     info.get("grossMargins"),
        "operating_margin": info.get("operatingMargins"),
        "profit_margin":    info.get("profitMargins"),
        "ebitda_margin":    info.get("ebitdaMargins"),
        "roe":              info.get("returnOnEquity"),
        "roa":              info.get("returnOnAssets"),
        "total_revenue":    info.get("totalRevenue"),
        "revenue_growth":   info.get("revenueGrowth"),
        "earnings_growth":  info.get("earningsGrowth"),
        "fcf":              info.get("freeCashflow"),
        "operating_cashflow": info.get("operatingCashflow"),
        "ebitda":           info.get("ebitda"),
        # Risk
        "beta":             info.get("beta"),
        "total_debt":       info.get("totalDebt"),
        "debt_to_equity":   info.get("debtToEquity"),
        "current_ratio":    info.get("currentRatio"),
        "quick_ratio":      info.get("quickRatio"),
        "nd_ebitda":        nd_ebitda,
        # Analyst
        "analyst_target":   info.get("targetMeanPrice"),
        "analyst_target_high": info.get("targetHighPrice"),
        "analyst_target_low":  info.get("targetLowPrice"),
        "analyst_count":    info.get("numberOfAnalystOpinions"),
        "recommendation":   info.get("recommendationKey"),
        # Dividend
        "dividend_yield":   info.get("dividendYield"),
        "payout_ratio":     info.get("payoutRatio"),
        # Shares
        "shares_outstanding": info.get("sharesOutstanding"),
        "short_ratio":      info.get("shortRatio"),
        # Metadata
        "timestamp":        datetime.utcnow().isoformat(),
        "_source":          "yfinance",
    }


def _fetch_stock_sync(symbol: str) -> dict:
    """Try bare symbol, then exchange suffixes."""
    try:
        t = yf.Ticker(symbol)
        info = t.info
        if _is_valid_info(info):
            return _build_stock_data(symbol, info)
    except Exception:
        pass

    if "." not in symbol:
        for suffix in EXCHANGE_SUFFIXES:
            try:
                candidate = symbol + suffix
                t = yf.Ticker(candidate)
                info = t.info
                if _is_valid_info(info):
                    return _build_stock_data(candidate, info)
            except Exception:
                continue

    return {"symbol": symbol, "error": f"Ticker '{symbol}' nicht gefunden.", "_source": "none"}


def _fetch_history_sync(symbol: str, period: str) -> dict:
    try:
        t = yf.Ticker(symbol)
        hist = t.history(period=period)
        if hist.empty:
            return {"symbol": symbol, "error": "Keine historischen Daten verfügbar."}
        return {
            "symbol":  symbol,
            "period":  period,
            "dates":   hist.index.strftime("%Y-%m-%d").tolist(),
            "closes":  [round(float(v), 4) for v in hist["Close"].tolist()],
            "volumes": [int(v) for v in hist["Volume"].tolist()],
            "opens":   [round(float(v), 4) for v in hist["Open"].tolist()],
            "highs":   [round(float(v), 4) for v in hist["High"].tolist()],
            "lows":    [round(float(v), 4) for v in hist["Low"].tolist()],
        }
    except Exception as e:
        return {"symbol": symbol, "error": str(e)}


def _search_tickers_sync(query: str) -> list[dict]:
    """Try query as ticker + common suffixes, return matches."""
    candidates = [query.upper()] + [query.upper() + s for s in EXCHANGE_SUFFIXES]
    results = []
    for candidate in candidates[:6]:
        try:
            info = yf.Ticker(candidate).info
            if info and _is_valid_info(info) and info.get("longName"):
                results.append({
                    "ticker":   candidate,
                    "name":     info.get("longName", candidate),
                    "sector":   info.get("sector"),
                    "exchange": info.get("exchange"),
                    "currency": info.get("currency"),
                })
        except Exception:
            continue
    return results[:3]


def _fetch_benchmarks_sync(period: str) -> dict:
    benchmarks = {
        "S&P 500":    "^GSPC",
        "MSCI World": "IWDA.L",
        "DAX":        "^GDAXI",
    }
    result = {}
    for name, sym in benchmarks.items():
        try:
            hist = yf.Ticker(sym).history(period=period)
            if hist.empty:
                continue
            closes = hist["Close"]
            base = closes.iloc[0]
            result[name] = {
                "dates":  hist.index.strftime("%Y-%m-%d").tolist(),
                "values": [round(float(v / base * 100), 2) for v in closes],
                "current_return_pct": round(float((closes.iloc[-1] - base) / base * 100), 2),
            }
        except Exception:
            continue
    return result


# ── Public async API ─────────────────────────────────────────────────────────

async def get_stock_data(symbol: str, av_key: str = "") -> dict:
    """
    Fetch fundamental + price data for a ticker.
    Cache: 15 min for price fields, 24 h for fundamentals.
    Falls back to Alpha Vantage for price if yfinance fails.
    """
    key = f"stock:{symbol.upper()}"
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL["price"]:
            return data

    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(_executor, _fetch_stock_sync, symbol.upper())

    # Alpha Vantage price fallback
    if data.get("error") and av_key:
        av_data = await _alpha_vantage_quote(symbol, av_key)
        if av_data:
            data.update(av_data)
            data.pop("error", None)

    _cache[key] = (data, time.time())
    return data


async def get_historical_prices(symbol: str, period: str = "1y") -> dict:
    key = f"hist:{symbol.upper()}:{period}"
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL["history"]:
            return data

    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(_executor, _fetch_history_sync, symbol.upper(), period)
    _cache[key] = (data, time.time())
    return data


async def search_ticker(query: str) -> list[dict]:
    key = f"search:{query.upper()}"
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL["search"]:
            return data

    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(_executor, _search_tickers_sync, query)
    _cache[key] = (results, time.time())
    return results


async def get_benchmark_data(period: str = "1y") -> dict:
    key = f"bench:{period}"
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL["benchmark"]:
            return data

    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(_executor, _fetch_benchmarks_sync, period)
    _cache[key] = (data, time.time())
    return data


async def get_market_movers() -> dict:
    """Top gainers/losers from a fixed watchlist of major indices."""
    key = "movers"
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL["price"]:
            return data

    # Major index tickers for a quick market overview
    watchlist = ["^GSPC", "^GDAXI", "^FTSE", "^N225", "^IXIC", "IWDA.L", "GC=F", "BZ=F"]

    async def _fetch_one(sym: str) -> Optional[dict]:
        data = await get_stock_data(sym)
        if data.get("error"):
            return None
        price = data.get("current_price")
        prev  = data.get("previous_close")
        if price and prev and prev > 0:
            chg_pct = round((price - prev) / prev * 100, 2)
            return {
                "symbol": sym,
                "name":   data.get("name", sym),
                "price":  price,
                "change_pct": chg_pct,
                "currency": data.get("currency", ""),
            }
        return None

    tasks = [_fetch_one(s) for s in watchlist]
    raw = await asyncio.gather(*tasks)
    items = [r for r in raw if r is not None]
    items.sort(key=lambda x: x["change_pct"], reverse=True)

    result = {
        "gainers": items[:3],
        "losers":  list(reversed(items[-3:])),
        "all":     items,
        "timestamp": datetime.utcnow().isoformat(),
    }
    _cache[key] = (result, time.time())
    return result


def clear_cache(symbol: Optional[str] = None):
    """Clear cache for a specific symbol or everything."""
    if symbol:
        keys_to_delete = [k for k in _cache if symbol.upper() in k]
        for k in keys_to_delete:
            del _cache[k]
    else:
        _cache.clear()
