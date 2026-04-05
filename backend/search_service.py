"""
NEXUS — Search Service
Uses Tavily API to fetch real-time financial data with sources.
"""
import asyncio
import httpx
from typing import Optional
from pathlib import Path
import json

TAVILY_API_URL = "https://api.tavily.com/search"

class SearchService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client: Optional[httpx.AsyncClient] = None

    async def init(self):
        self._client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        if self._client:
            await self._client.aclose()

    async def search(self, query: str, max_results: int = 5, search_depth: str = "advanced") -> dict:
        """
        Execute a Tavily search. Returns:
        {
            "success": bool,
            "results": [{"title": str, "url": str, "content": str}],
            "answer": str,  # Tavily's AI summary if available
            "error": str
        }
        """
        if not self._client:
            return {"success": False, "results": [], "answer": "", "error": "Not initialized"}
        try:
            resp = await self._client.post(TAVILY_API_URL, json={
                "api_key": self.api_key,
                "query": query,
                "search_depth": search_depth,
                "include_answer": True,
                "include_raw_content": False,
                "max_results": max_results,
            })
            resp.raise_for_status()
            data = resp.json()
            return {
                "success": True,
                "results": data.get("results", []),
                "answer": data.get("answer", ""),
                "error": None
            }
        except Exception as e:
            return {"success": False, "results": [], "answer": "", "error": str(e)}

    async def gather_sector_tickers(self, sector: str, filters: dict = None) -> dict:
        """
        For Elara: find ticker symbols in a sector (2 searches max).
        Quantitative data is fetched via yfinance afterwards.
        Returns: {"context": str, "sources": list}
        """
        region = filters.get("region", "") if filters else ""
        region_str = f" {region}" if region else ""

        queries = [
            f"{sector}{region_str} top stocks ticker symbols list 2024 2025",
            f"best {sector}{region_str} companies invest stock market leaders",
        ]

        all_results = []
        all_sources = []

        for query in queries:
            result = await self.search(query, max_results=5)
            if result["success"]:
                if result["answer"]:
                    all_results.append(result["answer"])
                for r in result["results"]:
                    all_results.append(f"[{r['url']}]: {r['content'][:500]}")
                    all_sources.append({"url": r["url"], "title": r["title"]})
            await asyncio.sleep(0.3)

        return {"context": "\n\n".join(all_results), "sources": all_sources}

    async def gather_ticker_qualitative(self, ticker: str, company_name: str = "") -> dict:
        """
        For Altair: qualitative data — insider activity, moat, risks.
        Uses company_name to avoid ticker-confusion (e.g. ORC.DE → Oracle, not Orchid Island).
        1 search, basic depth = ~75% weniger Tavily-Credits als vorher.
        Returns: {"context": str, "sources": list}
        """
        name = company_name or ticker
        # Single combined query using full company name to avoid ticker ambiguity
        query = f"{name} insider buying selling competitive advantage moat risks analyst 2025"

        all_results = []
        all_sources = []

        result = await self.search(query, max_results=3, search_depth="basic")
        if result["success"]:
            if result["answer"]:
                all_results.append(f"Summary: {result['answer']}")
            for r in result["results"]:
                all_results.append(f"[{r['url']}]: {r['content'][:400]}")
                all_sources.append({"url": r["url"], "title": r.get("title", r["url"])})

        return {"context": "\n\n".join(all_results), "sources": all_sources}

    async def resolve_primary_ticker(self, query: str) -> dict:
        """
        Given a ticker, company name, or ISIN, find the primary Yahoo Finance ticker.
        Returns: {"ticker": str, "name": str, "exchange": str, "found": bool}
        """
        import re
        result = await self.search(
            f"{query} stock ticker symbol Yahoo Finance primary exchange NYSE NASDAQ",
            max_results=5,
        )
        if not result["success"]:
            return {"ticker": query, "found": False}

        text = (result.get("answer", "") + " " +
                " ".join(r["content"] for r in result.get("results", [])[:3]))

        # Extract ticker candidates: 1-5 uppercase letters, optionally with exchange prefix like NYSE:AAPL
        candidates = re.findall(
            r'(?:NYSE|NASDAQ|NYSE Arca|S&P 500)?[:\s]?([A-Z]{1,5})\b(?:\s*[\(\[](?:NYSE|NASDAQ|US)[^\)]*[\)\]])?',
            text
        )
        # Filter noise words
        noise = {"THE", "AND", "FOR", "CEO", "CFO", "ETF", "IPO", "SEC", "INC", "LLC",
                 "AUM", "ROE", "FCF", "DCF", "PEG", "TTM", "USD", "EUR", "GBP", "AUD",
                 "ISIN", "US", "UK", "DE", "AN", "IN", "OF"}
        candidates = [c for c in candidates if c not in noise and len(c) >= 2]

        # Score: prefer tickers that appear multiple times
        from collections import Counter
        freq = Counter(candidates)
        if freq:
            best = freq.most_common(1)[0][0]
            return {"ticker": best, "name": "", "found": True, "raw": text[:300]}

        return {"ticker": query, "found": False}

    async def gather_ticker_data_full(self, ticker: str) -> dict:
        """
        Full Tavily fallback when yfinance has no data (e.g. cross-listing tickers).
        Does 5 searches covering both quantitative and qualitative data.
        """
        queries = [
            f"{ticker} stock price market cap valuation P/E ratio current",
            f"{ticker} revenue earnings FCF margin ROE debt fundamentals",
            f"{ticker} analyst forecast price target consensus 2024 2025",
            f"{ticker} insider buying selling transactions recent",
            f"{ticker} business model competitive advantage risks moat",
        ]
        all_results = []
        all_sources = []
        for query in queries:
            result = await self.search(query, max_results=4)
            if result["success"]:
                if result["answer"]:
                    all_results.append(f"Summary: {result['answer']}")
                for r in result["results"]:
                    all_results.append(f"[{r['url']}]: {r['content'][:600]}")
                    all_sources.append({"url": r["url"], "title": r["title"]})
            await asyncio.sleep(0.3)
        return {"context": "\n\n".join(all_results), "sources": all_sources}

    # Keep old method names for backward compatibility
    async def gather_sector_data(self, sector: str, filters: dict = None) -> dict:
        return await self.gather_sector_tickers(sector, filters)

    async def gather_ticker_data(self, ticker: str) -> dict:
        return await self.gather_ticker_qualitative(ticker)

    async def gather_ticker_data(self, ticker: str) -> dict:
        """
        For Altair: gather comprehensive data about a single ticker.
        Returns: {"context": str, "sources": list}
        """
        queries = [
            f"{ticker} stock current price market cap P/E ratio EV/EBITDA",
            f"{ticker} revenue growth earnings FCF margin ROE debt-to-equity",
            f"{ticker} analyst consensus price target earnings forecast 2024 2025",
            f"{ticker} insider buying selling transactions recent",
            f"{ticker} competitors peer comparison valuation",
            f"{ticker} risks business model competitive advantage moat",
        ]

        all_results = []
        all_sources = []

        for query in queries:
            result = await self.search(query, max_results=4)
            if result["success"]:
                all_results.append(f"Query: {query}")
                if result["answer"]:
                    all_results.append(f"Summary: {result['answer']}")
                for r in result["results"]:
                    all_results.append(f"Source [{r['url']}]: {r['content'][:600]}")
                    all_sources.append({"url": r["url"], "title": r["title"]})
            await asyncio.sleep(0.3)

        context = "\n\n".join(all_results)
        return {"context": context, "sources": all_sources}

    async def get_stock_price(self, ticker: str) -> dict:
        """Quick price lookup for portfolio refresh."""
        result = await self.search(f"{ticker} stock price today current", max_results=3)
        price = None
        if result["success"] and result["answer"]:
            import re
            patterns = [
                r"\$\s*([\d,]+\.?\d*)",
                r"([\d,]+\.?\d*)\s*USD",
                r"€\s*([\d,]+\.?\d*)",
                r"([\d,]+\.?\d*)\s*EUR",
            ]
            for pattern in patterns:
                matches = re.findall(pattern, result["answer"], re.IGNORECASE)
                for m in matches:
                    try:
                        v = float(m.replace(",", ""))
                        if 0.01 <= v <= 100_000:
                            price = round(v, 2)
                            break
                    except Exception:
                        continue
                if price:
                    break
        return {
            "success": price is not None,
            "ticker": ticker,
            "price": price,
            "raw": result.get("answer", ""),
            "error": None if price else "Preis nicht gefunden"
        }
