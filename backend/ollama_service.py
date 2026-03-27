"""
NEXUS — Ollama Service
Single-turn chat + multi-turn agentic loop for Altair deep-dive analysis.
"""
import httpx
import json
import re
import asyncio
from typing import Optional, Callable

OLLAMA_BASE_URL = "http://localhost:11434"

# Regex patterns for tool-call blocks the AI can emit
_RE_RESEARCH   = re.compile(r'```research\s*\n(.*?)```',   re.DOTALL | re.IGNORECASE)
_RE_CALCULATE  = re.compile(r'```calculate\s*\n(.*?)```',  re.DOTALL | re.IGNORECASE)


class OllamaService:
    def __init__(self, model: str = "qwen2.5:14b", num_ctx: int = 32768):
        self.model = model
        self.num_ctx = num_ctx
        self._client: Optional[httpx.AsyncClient] = None

    async def init(self):
        self._client = httpx.AsyncClient(timeout=600.0)
        try:
            resp = await self._client.get(f"{OLLAMA_BASE_URL}/api/tags")
            resp.raise_for_status()
            tags = resp.json()
            available = [m["name"] for m in tags.get("models", [])]
            print(f"[Ollama] Connected. Available models: {available}")
            model_base = self.model.split(":")[0]
            if not any(model_base in m for m in available):
                print(f"[Ollama] WARNING: Model '{self.model}' not found. Available: {available}")
        except Exception as e:
            print(f"[Ollama] WARNING: Could not connect to Ollama: {e}")

    async def close(self):
        if self._client:
            await self._client.aclose()

    async def is_available(self) -> bool:
        try:
            resp = await self._client.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
            return resp.status_code == 200
        except Exception:
            return False

    # ── Low-level: one streaming completion ───────────────────────────────────

    async def _complete(
        self,
        messages: list,
        progress_callback: Optional[Callable] = None,
        progress_prefix: str = "Generiere",
        timeout: float = 300.0,
    ) -> dict:
        """Send a message list to Ollama and collect the streamed response."""
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "options": {
                "num_ctx": self.num_ctx,
                "temperature": 0.1,
                "top_p": 0.9,
            },
        }

        collected = []
        chunk_count = 0

        try:
            async with self._client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload,
                timeout=timeout,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                        delta = chunk.get("message", {}).get("content", "")
                        if delta:
                            collected.append(delta)
                            chunk_count += 1
                            if progress_callback and chunk_count % 50 == 0:
                                chars = sum(len(c) for c in collected)
                                await progress_callback(f"{progress_prefix}... ({chars} Zeichen)")
                        if chunk.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue

            return {"success": True, "content": "".join(collected), "error": None}

        except httpx.TimeoutException:
            partial = "".join(collected)
            return {"success": bool(partial), "content": partial, "error": "Timeout — Teilantwort"}
        except Exception as e:
            return {"success": False, "content": "", "error": str(e)}

    # ── Simple single-turn chat (used by Elara and other modules) ─────────────

    async def chat(
        self,
        system_prompt: str,
        user_message: str,
        progress_callback: Optional[Callable] = None,
    ) -> dict:
        if not self._client:
            return {"success": False, "content": "", "error": "Service nicht initialisiert"}
        if not await self.is_available():
            return {"success": False, "content": "", "error": "Ollama läuft nicht. Bitte starte: 'ollama serve'"}

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ]
        result = await self._complete(messages, progress_callback, "Analyse läuft")
        if progress_callback:
            await progress_callback("Analyse abgeschlossen.")
        return result

    # ── Multi-turn agentic loop (used by Altair) ───────────────────────────────

    async def agentic_chat(
        self,
        system_prompt: str,
        user_message: str,
        search_fn: Callable,        # async (query: str) -> str
        calc_fn:   Callable,        # sync  (code: str)  -> str
        progress_callback: Optional[Callable] = None,
        max_rounds: int = 6,        # hard cap on model calls
        max_research: int = 2,      # max Tavily searches
        max_calc: int = 3,          # max Python executions
        total_timeout: int = 480,   # 8 minutes wall-clock across all rounds
    ) -> dict:
        """
        Agentic loop for Altair deep-dive.

        Each round the model may emit:
          ```research\n<query>\n```  → Tavily search, result fed back
          ```calculate\n<code>\n```  → Python sandbox, result fed back
          (neither)                  → treated as final report, loop exits

        Hard limits prevent infinite loops: max_rounds, max_research, max_calc,
        and a total wall-clock timeout.
        """
        if not self._client:
            return {"success": False, "content": "", "error": "Service nicht initialisiert"}
        if not await self.is_available():
            return {"success": False, "content": "", "error": "Ollama läuft nicht. Bitte starte: 'ollama serve'"}

        import time
        deadline = time.monotonic() + total_timeout

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ]

        research_count = 0
        calc_count     = 0
        final_content  = ""

        for round_num in range(1, max_rounds + 1):

            # ── Wall-clock guard ─────────────────────────────────────────────
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                if progress_callback:
                    await progress_callback(
                        f"⏱ Gesamt-Timeout ({total_timeout}s) erreicht nach {round_num-1} Schritten. "
                        f"Letztes Ergebnis wird verwendet."
                    )
                break

            if progress_callback:
                mins = int(remaining // 60)
                secs = int(remaining % 60)
                await progress_callback(
                    f"Schritt {round_num}/{max_rounds} — "
                    f"Recherchen: {research_count}/{max_research}  "
                    f"Berechnungen: {calc_count}/{max_calc}  "
                    f"(noch {mins}:{secs:02d} min)"
                )

            # Clamp per-call timeout to remaining budget
            per_call_timeout = min(240.0, max(30.0, remaining - 10))

            result = await self._complete(
                messages,
                progress_callback,
                progress_prefix=f"Schritt {round_num}",
                timeout=per_call_timeout,
            )
            if not result["success"]:
                return {
                    "success": bool(final_content),
                    "content": final_content or result.get("content", ""),
                    "error":   result.get("error"),
                    "rounds":  round_num,
                }

            content = result["content"]
            messages.append({"role": "assistant", "content": content})
            final_content = content

            # ── Tool: research ───────────────────────────────────────────────
            research_match = _RE_RESEARCH.search(content)
            calc_match     = _RE_CALCULATE.search(content)

            if research_match and research_count < max_research:
                query = research_match.group(1).strip()
                research_count += 1
                if progress_callback:
                    await progress_callback(
                        f"Recherche {research_count}/{max_research}: \"{query[:80]}{'…' if len(query) > 80 else ''}\""
                    )
                search_result = await search_fn(query)
                # If research limit now reached, push directly to calculation
                next_hint = (
                    "Recherche-Limit erreicht. Führe jetzt direkt ```calculate aus."
                    if research_count >= max_research
                    else "Falls weitere Berechnungen nötig sind, nutze ```calculate."
                )
                messages.append({
                    "role": "user",
                    "content": (
                        f"RECHERCHE-ERGEBNIS ({research_count}) für: \"{query}\"\n\n"
                        f"{search_result}\n\n"
                        f"{next_hint} Danach schreibe den vollständigen Report."
                    ),
                })
                continue

            # ── Tool: calculate ──────────────────────────────────────────────
            if calc_match and calc_count < max_calc:
                code = calc_match.group(1).strip()
                calc_count += 1
                if progress_callback:
                    await progress_callback(f"Python-Berechnung {calc_count}/{max_calc} läuft...")
                loop = asyncio.get_event_loop()
                calc_result = await loop.run_in_executor(None, calc_fn, code)
                next_hint = (
                    "Berechnungs-Limit erreicht. Schreibe jetzt den vollständigen Altair-Report."
                    if calc_count >= max_calc
                    else "Falls weitere Berechnungen nötig sind, nutze ```calculate. Sonst schreibe den Report."
                )
                messages.append({
                    "role": "user",
                    "content": (
                        f"BERECHNUNGS-ERGEBNIS ({calc_count}):\n\n"
                        f"{calc_result}\n\n"
                        f"{next_hint}"
                    ),
                })
                continue

            # ── Limits exceeded but model still emitting tool blocks ─────────
            if research_match or calc_match:
                # Model wants more tools but limits are reached — force final answer
                messages.append({
                    "role": "user",
                    "content": (
                        "Alle Tool-Limits sind ausgeschöpft (Recherchen und Berechnungen abgeschlossen). "
                        "Schreibe JETZT den vollständigen Altair-Report mit den bereits vorliegenden Ergebnissen. "
                        "Keine weiteren ```research oder ```calculate Blöcke."
                    ),
                })
                continue

            # ── No tool call → final report ──────────────────────────────────
            if progress_callback:
                elapsed = total_timeout - (deadline - time.monotonic())
                await progress_callback(
                    f"✓ Analyse abgeschlossen — {round_num} Schritte, "
                    f"{research_count} Recherchen, {calc_count} Berechnungen, "
                    f"{int(elapsed)}s gesamt."
                )
            return {
                "success": True,
                "content": content,
                "error":   None,
                "rounds":  round_num,
            }

        # Max rounds or timeout reached
        if progress_callback:
            await progress_callback(
                f"Max. Schritte/Timeout erreicht ({round_num} Runden). Letzter Stand wird verwendet."
            )
        return {
            "success": bool(final_content),
            "content": final_content,
            "error":   None,   # partial result is still usable
            "rounds":  round_num,
        }
