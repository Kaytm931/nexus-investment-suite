"""
NEXUS — Python Calculation Sandbox
Executes LLM-generated financial calculation code in an isolated subprocess.
Only math/statistics operations are permitted — file I/O and network are blocked.
"""
import subprocess
import sys
import re

# Patterns that must not appear in submitted code
_BLOCKED = [
    r'\bopen\s*\(',
    r'\bexec\s*\(',
    r'\beval\s*\(',
    r'\b__import__\s*\(',
    r'\bcompile\s*\(',
    r'\bglobals\s*\(',
    r'\blocals\s*\(',
    r'\bgetattr\s*\(',
    r'\bsetattr\s*\(',
    r'\bdelattr\s*\(',
    r'\bimport\s+os\b',
    r'\bimport\s+sys\b',
    r'\bimport\s+subprocess\b',
    r'\bimport\s+shutil\b',
    r'\bimport\s+socket\b',
    r'\bimport\s+requests\b',
    r'\bimport\s+httpx\b',
    r'\bimport\s+urllib\b',
    r'\bimport\s+pathlib\b',
    r'\bimport\s+glob\b',
]

def _is_safe(code: str) -> tuple[bool, str]:
    for pattern in _BLOCKED:
        if re.search(pattern, code):
            return False, f"Nicht erlaubtes Muster: '{pattern}'"
    return True, ""


def run_python(code: str, timeout: int = 30) -> str:
    """
    Execute Python code in a subprocess.
    Returns stdout (max 3000 chars) or a descriptive error string.
    """
    safe, reason = _is_safe(code)
    if not safe:
        return f"SANDBOX FEHLER: {reason}"

    # Prepend safe math imports so the AI doesn't need to import them
    preamble = "import math, statistics\ntry:\n    import numpy as np\nexcept ImportError:\n    pass\n"
    full_code = preamble + code

    try:
        result = subprocess.run(
            [sys.executable, "-c", full_code],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            stderr = result.stderr.strip()[-800:]
            return f"PYTHON FEHLER:\n{stderr}"
        output = result.stdout.strip()
        if not output:
            return "(Kein Output — bitte print() für alle Ergebnisse verwenden)"
        return output[:3000]
    except subprocess.TimeoutExpired:
        return f"FEHLER: Timeout nach {timeout}s — Endlosschleife oder zu komplex"
    except Exception as e:
        return f"SANDBOX FEHLER: {e}"
