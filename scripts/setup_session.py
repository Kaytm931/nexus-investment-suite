"""
NEXUS Investment Suite — Session Setup Script
Opens a visible browser for the user to log in to Perplexity.
Run via: python scripts/setup_session.py
Or via:  setup_session.bat
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path so we can import backend modules
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from playwright_service import PerplexityService


async def main():
    print("\n[NEXUS] Initializing Playwright for session setup...")
    service = PerplexityService()
    try:
        await service.setup_session()
        print("\n[NEXUS] Session setup complete.")
        print("[NEXUS] You can now run start.bat to launch NEXUS.")
    except KeyboardInterrupt:
        print("\n[NEXUS] Session setup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Session setup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
