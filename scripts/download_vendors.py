"""
NEXUS Investment Suite — Vendor Download Script
Downloads Chart.js and any other frontend vendor libraries for offline use.
Run via: python scripts/download_vendors.py
Or automatically via start.bat on first run.
"""

import urllib.request
import urllib.error
from pathlib import Path
import sys


def main():
    # Resolve paths relative to project root (parent of scripts/)
    project_root = Path(__file__).parent.parent
    vendors_dir  = project_root / "frontend" / "vendor"
    vendors_dir.mkdir(parents=True, exist_ok=True)

    # Files to download: { filename: url }
    files = {
        "chart.min.js": "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js",
    }

    print("NEXUS — Downloading vendor libraries")
    print("=" * 42)

    all_ok = True

    for filename, url in files.items():
        target = vendors_dir / filename

        if target.exists():
            size = target.stat().st_size
            if size > 1000:  # Sanity check: file should be > 1KB
                print(f"[SKIP] {filename} already exists ({size:,} bytes)")
                continue
            else:
                print(f"[WARN] {filename} exists but is very small ({size} bytes). Re-downloading...")

        print(f"[DOWN] Downloading {filename}...")
        print(f"       from {url}")
        try:
            # Set User-Agent to avoid 403 errors from CDNs
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (NEXUS/1.0)"},
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                content = response.read()

            target.write_bytes(content)
            print(f"[OK]   Saved {filename} ({len(content):,} bytes)")

        except urllib.error.URLError as e:
            print(f"[ERR]  Failed to download {filename}: {e}")
            all_ok = False
        except OSError as e:
            print(f"[ERR]  Could not save {filename}: {e}")
            all_ok = False

    print("=" * 42)
    if all_ok:
        print("All vendor files downloaded successfully.")
    else:
        print("Some files failed to download. Check your internet connection.")
        print("You can retry by running: python scripts/download_vendors.py")
        sys.exit(1)


if __name__ == "__main__":
    main()
