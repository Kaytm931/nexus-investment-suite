"""
NEXUS Investment Suite — AI Engine
Unified interface for Claude API and Ollama (local).
Provider is determined per-request based on available API key.
"""

import json
import httpx
from typing import Optional, Callable, AsyncGenerator


class AIEngine:
    """
    Abstraction layer over Claude and Ollama.
    Usage:
        engine = AIEngine(provider="claude", api_key="sk-ant-...")
        response = await engine.chat(system, user, progress_cb)
    """

    CLAUDE_API_BASE = "https://api.anthropic.com/v1"
    CLAUDE_MODEL    = "claude-sonnet-4-20250514"
    OLLAMA_BASE     = "http://localhost:11434"
    OLLAMA_MODEL    = "gemma3:27b"

    def __init__(self, provider: str = "ollama", api_key: Optional[str] = None,
                 ollama_model: Optional[str] = None, ollama_base: Optional[str] = None):
        """
        Args:
            provider:     'claude' | 'ollama'
            api_key:      Claude API key (sk-ant-...). Required for provider='claude'.
            ollama_model: Override Ollama model (default: gemma3:27b)
            ollama_base:  Override Ollama base URL
        """
        self.provider     = provider
        self.api_key      = api_key
        self.ollama_model = ollama_model or self.OLLAMA_MODEL
        self.ollama_base  = (ollama_base or self.OLLAMA_BASE).rstrip("/")

    # ─── Public interface ───────────────────────────────────────────────────

    async def chat(
        self,
        system:   str,
        user:     str,
        progress: Optional[Callable[[str], None]] = None,
    ) -> dict:
        """Single-turn conversation. Returns {success, content, error, provider}."""
        if self.provider == "claude":
            return await self._claude_chat(system, user, progress)
        return await self._ollama_chat(system, user, progress)

    async def agentic_chat(
        self,
        system:       str,
        user:         str,
        search_fn:    Optional[Callable] = None,
        calc_fn:      Optional[Callable] = None,
        progress:     Optional[Callable[[str], None]] = None,
        max_rounds:   int = 10,
        max_research: int = 2,
        max_calc:     int = 3,
    ) -> dict:
        """
        Multi-turn agentic loop.
        Model may emit:
            ```research\n<query>\n```  → calls search_fn(query)
            ```calculate\n<code>\n```  → calls calc_fn(code)
        Continues until no tool calls detected or limits reached.
        """
        if self.provider == "claude":
            return await self._claude_agentic(system, user, search_fn, calc_fn, progress,
                                              max_rounds, max_research, max_calc)
        return await self._ollama_agentic(system, user, search_fn, calc_fn, progress,
                                         max_rounds, max_research, max_calc)

    async def is_available(self) -> bool:
        """Check if the configured provider is reachable."""
        if self.provider == "claude":
            return bool(self.api_key and self.api_key.startswith("sk-ant-"))
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                r = await client.get(f"{self.ollama_base}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    # ─── Claude implementation ──────────────────────────────────────────────

    async def _claude_chat(self, system: str, user: str,
                           progress: Optional[Callable]) -> dict:
        _prog(progress, "Sende Anfrage an Claude…")
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                payload = {
                    "model": self.CLAUDE_MODEL,
                    "max_tokens": 8192,
                    "system": system,
                    "messages": [{"role": "user", "content": user}],
                    "stream": True,
                }
                chunks = []
                async with client.stream("POST",
                                         f"{self.CLAUDE_API_BASE}/messages",
                                         headers=self._claude_headers(),
                                         json=payload) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        return {"success": False, "error": f"Claude HTTP {resp.status_code}: {body.decode()[:300]}", "provider": "claude"}
                    async for line in resp.aiter_lines():
                        if line.startswith("data:"):
                            raw = line[5:].strip()
                            if raw == "[DONE]":
                                break
                            try:
                                ev = json.loads(raw)
                                if ev.get("type") == "content_block_delta":
                                    chunks.append(ev["delta"].get("text", ""))
                            except json.JSONDecodeError:
                                pass
                content = "".join(chunks)
                _prog(progress, f"Claude Antwort empfangen ({len(content)} Zeichen)")
                return {"success": True, "content": content, "provider": "claude"}
        except Exception as e:
            return {"success": False, "error": str(e), "provider": "claude"}

    async def _claude_agentic(self, system, user, search_fn, calc_fn, progress,
                               max_rounds, max_research, max_calc) -> dict:
        import re
        messages = [{"role": "user", "content": user}]
        research_used = calc_used = 0
        content = ""

        for round_num in range(max_rounds):
            _prog(progress, f"Claude Runde {round_num + 1}/{max_rounds}…")
            try:
                async with httpx.AsyncClient(timeout=120) as client:
                    payload = {
                        "model": self.CLAUDE_MODEL,
                        "max_tokens": 8192,
                        "system": system,
                        "messages": messages,
                    }
                    r = await client.post(f"{self.CLAUDE_API_BASE}/messages",
                                         headers=self._claude_headers(), json=payload)
                    if r.status_code != 200:
                        break
                    data = r.json()
                    content = data["content"][0]["text"]
                    messages.append({"role": "assistant", "content": content})

                    # Parse tool calls
                    research_match = re.search(r"```research\n(.*?)\n```", content, re.DOTALL)
                    calc_match = re.search(r"```calculate\n(.*?)\n```", content, re.DOTALL)

                    if research_match and search_fn and research_used < max_research:
                        query = research_match.group(1).strip()
                        _prog(progress, f"🔍 Recherche: {query[:80]}")
                        result = await search_fn(query)
                        messages.append({"role": "user", "content": f"[RESEARCH RESULT]\n{result}"})
                        research_used += 1
                    elif calc_match and calc_fn and calc_used < max_calc:
                        code = calc_match.group(1).strip()
                        _prog(progress, f"🧮 Berechnung…")
                        result = await calc_fn(code)
                        messages.append({"role": "user", "content": f"[CALCULATION RESULT]\n{result}"})
                        calc_used += 1
                    else:
                        break  # No more tool calls → done
            except Exception as e:
                return {"success": False, "error": str(e), "provider": "claude"}

        return {"success": True, "content": content, "provider": "claude",
                "rounds": round_num + 1, "research_calls": research_used, "calc_calls": calc_used}

    def _claude_headers(self) -> dict:
        return {
            "x-api-key":         self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type":      "application/json",
        }

    # ─── Ollama implementation ──────────────────────────────────────────────

    async def _ollama_chat(self, system: str, user: str,
                           progress: Optional[Callable]) -> dict:
        _prog(progress, f"Sende Anfrage an Ollama ({self.ollama_model})…")
        try:
            async with httpx.AsyncClient(timeout=300) as client:
                payload = {
                    "model": self.ollama_model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user},
                    ],
                    "stream": True,
                    "options": {"num_ctx": 32768},
                }
                chunks = []
                count  = 0
                async with client.stream("POST", f"{self.ollama_base}/api/chat",
                                         json=payload) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        return {"success": False, "error": f"Ollama HTTP {resp.status_code}: {body.decode()[:200]}", "provider": "ollama"}
                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        try:
                            ev = json.loads(line)
                            chunks.append(ev.get("message", {}).get("content", ""))
                            count += 1
                            if count % 100 == 0:
                                _prog(progress, f"Generiere… ({count} Tokens)")
                        except json.JSONDecodeError:
                            pass
                content = "".join(chunks)
                return {"success": True, "content": content, "provider": "ollama"}
        except Exception as e:
            return {"success": False, "error": str(e), "provider": "ollama"}

    async def _ollama_agentic(self, system, user, search_fn, calc_fn, progress,
                               max_rounds, max_research, max_calc) -> dict:
        import re
        messages = [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ]
        research_used = calc_used = 0
        content = ""

        for round_num in range(max_rounds):
            _prog(progress, f"Ollama Runde {round_num + 1}/{max_rounds}…")
            try:
                async with httpx.AsyncClient(timeout=300) as client:
                    payload = {
                        "model": self.ollama_model,
                        "messages": messages,
                        "stream": False,
                        "options": {"num_ctx": 32768},
                    }
                    r = await client.post(f"{self.ollama_base}/api/chat", json=payload)
                    if r.status_code != 200:
                        break
                    data = r.json()
                    content = data.get("message", {}).get("content", "")
                    messages.append({"role": "assistant", "content": content})

                    research_match = re.search(r"```research\n(.*?)\n```", content, re.DOTALL)
                    calc_match = re.search(r"```calculate\n(.*?)\n```", content, re.DOTALL)

                    if research_match and search_fn and research_used < max_research:
                        query = research_match.group(1).strip()
                        _prog(progress, f"🔍 Recherche: {query[:80]}")
                        result = await search_fn(query)
                        messages.append({"role": "user", "content": f"[RESEARCH RESULT]\n{result}"})
                        research_used += 1
                    elif calc_match and calc_fn and calc_used < max_calc:
                        code = calc_match.group(1).strip()
                        _prog(progress, f"🧮 Berechnung…")
                        result = await calc_fn(code)
                        messages.append({"role": "user", "content": f"[CALCULATION RESULT]\n{result}"})
                        calc_used += 1
                    else:
                        break
            except Exception as e:
                return {"success": False, "error": str(e), "provider": "ollama"}

        return {"success": True, "content": content, "provider": "ollama",
                "rounds": round_num + 1, "research_calls": research_used, "calc_calls": calc_used}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _prog(cb: Optional[Callable], msg: str):
    if cb:
        cb(msg)


def engine_from_config(config: dict, user_claude_key: Optional[str] = None) -> AIEngine:
    """
    Factory: builds AIEngine from app config + optional user BYOK key.
    If a Claude key is present → use Claude.
    Otherwise fall back to Ollama with config settings.
    """
    if user_claude_key and user_claude_key.startswith("sk-ant-"):
        return AIEngine(provider="claude", api_key=user_claude_key)

    return AIEngine(
        provider="ollama",
        ollama_model=config.get("ollama_model", "gemma3:27b"),
        ollama_base=config.get("ollama_base_url", "http://localhost:11434"),
    )
