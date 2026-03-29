"""
NEXUS — Groq Service
Drop-in replacement for OllamaService using Groq's free OpenAI-compatible API.
Same interface: chat(), agentic_chat(), is_available(), init(), close()
"""
import httpx
import json
import re
import asyncio
import time
from typing import Optional, Callable

GROQ_API_BASE = "https://api.groq.com/openai/v1"
GROQ_MODEL    = "llama-3.3-70b-versatile"   # 128K ctx, best free option

_RE_RESEARCH  = re.compile(r'```research\s*\n(.*?)```',  re.DOTALL | re.IGNORECASE)
_RE_CALCULATE = re.compile(r'```calculate\s*\n(.*?)```', re.DOTALL | re.IGNORECASE)


class GroqService:
    def __init__(self, api_key: str, model: str = GROQ_MODEL):
        self.api_key = api_key
        self.model   = model
        self._client: Optional[httpx.AsyncClient] = None

    async def init(self):
        self._client = httpx.AsyncClient(timeout=120.0)
        print(f"[Groq] Initialized. Model: {self.model}")

    async def close(self):
        if self._client:
            await self._client.aclose()

    async def is_available(self) -> bool:
        return bool(self.api_key and self._client)

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type":  "application/json",
        }

    # ── Low-level: one streaming completion ────────────────────────────────────

    async def _complete(
        self,
        messages: list,
        progress_callback: Optional[Callable] = None,
        progress_prefix: str = "Generiere",
        timeout: float = 120.0,
    ) -> dict:
        payload = {
            "model":       self.model,
            "messages":    messages,
            "stream":      True,
            "temperature": 0.1,
            "max_tokens":  8192,
        }
        collected   = []
        chunk_count = 0

        try:
            async with self._client.stream(
                "POST",
                f"{GROQ_API_BASE}/chat/completions",
                headers=self._headers(),
                json=payload,
                timeout=timeout,
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    return {
                        "success": False,
                        "content": "",
                        "error": f"Groq HTTP {response.status_code}: {body.decode()[:300]}",
                    }
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    raw = line[5:].strip()
                    if raw == "[DONE]":
                        break
                    try:
                        ev    = json.loads(raw)
                        delta = ev.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        if delta:
                            collected.append(delta)
                            chunk_count += 1
                            if progress_callback and chunk_count % 50 == 0:
                                chars = sum(len(c) for c in collected)
                                await progress_callback(f"{progress_prefix}... ({chars} Zeichen)")
                    except json.JSONDecodeError:
                        continue

            return {"success": True, "content": "".join(collected), "error": None}

        except httpx.TimeoutException:
            partial = "".join(collected)
            return {"success": bool(partial), "content": partial, "error": "Timeout — Teilantwort"}
        except Exception as e:
            return {"success": False, "content": "", "error": str(e)}

    # ── Simple single-turn chat (Elara) ────────────────────────────────────────

    async def chat(
        self,
        system_prompt: str,
        user_message: str,
        progress_callback: Optional[Callable] = None,
    ) -> dict:
        if not self._client:
            return {"success": False, "content": "", "error": "Service nicht initialisiert"}

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ]
        result = await self._complete(messages, progress_callback, "Analyse läuft")
        if progress_callback:
            await progress_callback("Analyse abgeschlossen.")
        return result

    # ── Multi-turn agentic loop (Altair) ───────────────────────────────────────

    async def agentic_chat(
        self,
        system_prompt: str,
        user_message: str,
        search_fn: Callable,
        calc_fn:   Callable,
        progress_callback: Optional[Callable] = None,
        max_rounds: int = 6,
        max_research: int = 2,
        max_calc: int = 3,
        total_timeout: int = 480,
    ) -> dict:
        if not self._client:
            return {"success": False, "content": "", "error": "Service nicht initialisiert"}

        deadline = time.monotonic() + total_timeout
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ]
        research_count = 0
        calc_count     = 0
        final_content  = ""

        for round_num in range(1, max_rounds + 1):

            remaining = deadline - time.monotonic()
            if remaining <= 0:
                if progress_callback:
                    await progress_callback(
                        f"⏱ Gesamt-Timeout ({total_timeout}s) erreicht nach {round_num-1} Schritten. "
                        "Letztes Ergebnis wird verwendet."
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

            per_call_timeout = min(120.0, max(30.0, remaining - 10))
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

            research_match = _RE_RESEARCH.search(content)
            calc_match     = _RE_CALCULATE.search(content)

            if research_match and research_count < max_research:
                query = research_match.group(1).strip()
                research_count += 1
                if progress_callback:
                    await progress_callback(
                        f"Recherche {research_count}/{max_research}: "
                        f"\"{query[:80]}{'…' if len(query) > 80 else ''}\""
                    )
                search_result = await search_fn(query)
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

            if research_match or calc_match:
                messages.append({
                    "role": "user",
                    "content": (
                        "Alle Tool-Limits sind ausgeschöpft. "
                        "Schreibe JETZT den vollständigen Report mit den bereits vorliegenden Ergebnissen. "
                        "Keine weiteren ```research oder ```calculate Blöcke."
                    ),
                })
                continue

            # No tool call → final report
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

        if progress_callback:
            await progress_callback(
                f"Max. Schritte/Timeout erreicht ({round_num} Runden). Letzter Stand wird verwendet."
            )
        return {
            "success": bool(final_content),
            "content": final_content,
            "error":   None,
            "rounds":  round_num,
        }
