"""
NEXUS Investment Suite — yFinance Service
Fetches structured financial data directly from Yahoo Finance.
No API key needed, no token cost, returns clean numbers.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
import yfinance as yf


class YFinanceService:
    def __init__(self):
        self._executor = ThreadPoolExecutor(max_workers=6)

    # Common exchange suffixes to try when bare ticker returns no data
    _SUFFIXES = [".AX", ".TO", ".L", ".DE", ".F", ".PA", ".AS", ".SW", ".HK", ".T"]

    def _fetch_sync(self, ticker: str) -> dict:
        """Synchronous yfinance fetch — tries exchange suffixes if bare ticker fails."""
        def _valid(info: dict) -> bool:
            return bool(
                info.get("regularMarketPrice")
                or info.get("currentPrice")
                or info.get("previousClose")
            )

        # 1. Try as-is
        try:
            t = yf.Ticker(ticker)
            info = t.info
            if _valid(info):
                return self._build_result(ticker, info)
        except Exception:
            pass

        # 2. Try with exchange suffixes
        if "." not in ticker:
            for suffix in self._SUFFIXES:
                try:
                    candidate = ticker + suffix
                    t = yf.Ticker(candidate)
                    info = t.info
                    if _valid(info):
                        return self._build_result(candidate, info)
                except Exception:
                    continue

        return {"ticker": ticker, "error": "Ticker nicht gefunden. Versuche Ticker mit Börsen-Suffix (z.B. FFX.AX für Australien, FFX.TO für Kanada)"}

    def _build_result(self, ticker: str, info: dict) -> dict:
        """Extract relevant fields from yfinance info dict."""
        try:

            return {
                "ticker": ticker,
                "name": info.get("longName") or info.get("shortName", ticker),
                "sector": info.get("sector", ""),
                "industry": info.get("industry", ""),
                "country": info.get("country", ""),
                "currency": info.get("currency", "USD"),
                # Price
                "current_price": info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose"),
                "previous_close": info.get("previousClose"),
                "week52_high": info.get("fiftyTwoWeekHigh"),
                "week52_low": info.get("fiftyTwoWeekLow"),
                # Valuation
                "market_cap": info.get("marketCap"),
                "enterprise_value": info.get("enterpriseValue"),
                "trailing_pe": info.get("trailingPE"),
                "forward_pe": info.get("forwardPE"),
                "price_to_book": info.get("priceToBook"),
                "ev_ebitda": info.get("enterpriseToEbitda"),
                "ev_revenue": info.get("enterpriseToRevenue"),
                "peg_ratio": info.get("trailingPegRatio") or info.get("pegRatio"),
                "price_to_sales": info.get("priceToSalesTrailing12Months"),
                # Quality
                "gross_margins": info.get("grossMargins"),
                "operating_margins": info.get("operatingMargins"),
                "profit_margins": info.get("profitMargins"),
                "roe": info.get("returnOnEquity"),
                "roa": info.get("returnOnAssets"),
                "total_revenue": info.get("totalRevenue"),
                "revenue_growth": info.get("revenueGrowth"),
                "earnings_growth": info.get("earningsGrowth"),
                "free_cashflow": info.get("freeCashflow"),
                "operating_cashflow": info.get("operatingCashflow"),
                # Risk
                "beta": info.get("beta"),
                "debt_to_equity": info.get("debtToEquity"),
                "current_ratio": info.get("currentRatio"),
                "quick_ratio": info.get("quickRatio"),
                "total_debt": info.get("totalDebt"),
                "interest_expense": info.get("interestExpense"),
                # Analyst
                "recommendation": info.get("recommendationKey"),
                "recommendation_mean": info.get("recommendationMean"),
                "target_price_mean": info.get("targetMeanPrice"),
                "target_price_high": info.get("targetHighPrice"),
                "target_price_low": info.get("targetLowPrice"),
                "analyst_count": info.get("numberOfAnalystOpinions"),
                # Dividend
                "dividend_yield": info.get("dividendYield"),
                "payout_ratio": info.get("payoutRatio"),
                # Shares
                "shares_outstanding": info.get("sharesOutstanding"),
                "float_shares": info.get("floatShares"),
                "short_ratio": info.get("shortRatio"),
            }
        except Exception as e:
            return {"ticker": ticker, "error": str(e)}

    async def get_ticker_data(self, ticker: str) -> dict:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, self._fetch_sync, ticker)

    async def get_multiple(self, tickers: list[str]) -> list[dict]:
        """Fetch multiple tickers in parallel."""
        tasks = [self.get_ticker_data(t) for t in tickers]
        return await asyncio.gather(*tasks)

    def format_for_prompt(self, data: dict) -> str:
        """Format as structured text block for the LLM — token-efficient."""
        if data.get("error") and not data.get("current_price"):
            return f"[{data['ticker']}] Keine Daten: {data.get('error', 'unbekannt')}\n"

        def f(v, pct=False, billions=False):
            if v is None:
                return "n/a"
            try:
                v = float(v)
                if pct:
                    return f"{v * 100:.1f}%"
                if billions or abs(v) >= 1e9:
                    return f"{v / 1e9:.2f}B"
                if abs(v) >= 1e6:
                    return f"{v / 1e6:.1f}M"
                return f"{v:.2f}"
            except Exception:
                return str(v)

        cur = data.get("currency", "")
        lines = [
            f"=== {data.get('name', data['ticker'])} ({data['ticker']}) [{cur}] ===",
            f"Sektor: {data.get('sector') or 'n/a'}  |  Industrie: {data.get('industry') or 'n/a'}  |  Land: {data.get('country') or 'n/a'}",
            "",
            "KURS & BEWERTUNG:",
            f"  Kurs:            {f(data.get('current_price'))} {cur}",
            f"  Mkt Cap:         {f(data.get('market_cap'))}",
            f"  Enterprise Val:  {f(data.get('enterprise_value'))}",
            f"  52W High/Low:    {f(data.get('week52_high'))} / {f(data.get('week52_low'))}",
            f"  KGV (TTM):       {f(data.get('trailing_pe'))}",
            f"  KGV (Forward):   {f(data.get('forward_pe'))}",
            f"  EV/EBITDA:       {f(data.get('ev_ebitda'))}",
            f"  P/B:             {f(data.get('price_to_book'))}",
            f"  P/S:             {f(data.get('price_to_sales'))}",
            f"  PEG:             {f(data.get('peg_ratio'))}",
            "",
            "QUALITÄT:",
            f"  Bruttomarge:     {f(data.get('gross_margins'), pct=True)}",
            f"  Op. Marge:       {f(data.get('operating_margins'), pct=True)}",
            f"  Nettomarge:      {f(data.get('profit_margins'), pct=True)}",
            f"  ROE:             {f(data.get('roe'), pct=True)}",
            f"  ROA:             {f(data.get('roa'), pct=True)}",
            f"  Umsatz (TTM):    {f(data.get('total_revenue'))}",
            f"  Free Cashflow:   {f(data.get('free_cashflow'))}",
            f"  Umsatzwachstum:  {f(data.get('revenue_growth'), pct=True)}",
            f"  Gewinnwachstum:  {f(data.get('earnings_growth'), pct=True)}",
            "",
            "RISIKO:",
            f"  Beta:            {f(data.get('beta'))}",
            f"  Debt/Equity:     {f(data.get('debt_to_equity'))}",
            f"  Current Ratio:   {f(data.get('current_ratio'))}",
            f"  Gesamtschulden:  {f(data.get('total_debt'))}",
            f"  Short Ratio:     {f(data.get('short_ratio'))}",
            "",
            "ANALYSTEN:",
            f"  Empfehlung:      {data.get('recommendation') or 'n/a'}  (Mean: {f(data.get('recommendation_mean'))}/5, n={data.get('analyst_count') or 'n/a'})",
            f"  Kursziel:        Ø {f(data.get('target_price_mean'))}  Hoch {f(data.get('target_price_high'))}  Tief {f(data.get('target_price_low'))}",
            "",
            "DIVIDENDE:",
            f"  Rendite:         {f(data.get('dividend_yield'), pct=True)}",
            f"  Payout Ratio:    {f(data.get('payout_ratio'), pct=True)}",
        ]
        return "\n".join(lines)
