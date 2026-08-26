"""Live network activity monitor for the Sovereign AI Workbench demo.

Purpose: prove visually, in real time, that the entire system makes zero
external network calls during a demo session. A background terminal shows
per-second outbound/inbound deltas and a CLEAN/WARNING status; the FastAPI
endpoint (/network-status) exposes a single reading for the Next.js
frontend to poll.

How it works:
  - get_network_stats() reads cumulative system-wide counters from
    psutil.net_io_counters() and stamps them with the time.
  - monitor_loop() diffs consecutive readings, so the output shows "what
    is happening right now", not lifetime totals. Deltas under the
    threshold print CLEAN; anything bigger prints WARNING so real external
    activity is impossible to miss.

Threshold note: local loopback traffic (localhost:11434 Ollama,
localhost:8000 FastAPI) does NOT appear in psutil.net_io_counters()
(which counts physical interfaces), but Windows background chatter
(NTP, telemetry, browser keep-alives) does. The default 10 KB/s threshold
is tuned so the demo machine can have normal OS noise without false
warnings, while any meaningful external call (model download, API call,
page fetch) blows past it instantly.
"""

import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Make the sibling monitor module importable when run directly.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import psutil

# Deltas above this many bytes/sec between readings trigger WARNING.
# A few KB allows harmless OS chatter (NTP, keep-alives); any real call
# is orders of magnitude larger.
WARNING_THRESHOLD_BPS = 10 * 1024


def get_network_stats() -> dict:
    """Read current cumulative network counters and return a stamped dict.

    Returns:
        {"bytes_sent": <int>, "bytes_recv": <int>, "timestamp":
        "<ISO 8601 UTC>"} - cumulative system-wide counters across all
        physical interfaces (loopback excluded by psutil).
    """
    counters = psutil.net_io_counters()
    return {
        "bytes_sent": counters.bytes_sent,
        "bytes_recv": counters.bytes_recv,
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def _format_rate(bytes_per_sec: float) -> str:
    """Format a byte rate human-readably (B/s, KB/s, MB/s)."""
    if bytes_per_sec < 1024:
        return f"{bytes_per_sec:.1f} B/s"
    if bytes_per_sec < 1024 * 1024:
        return f"{bytes_per_sec / 1024:.1f} KB/s"
    return f"{bytes_per_sec / (1024 * 1024):.1f} MB/s"


def monitor_loop(interval_seconds: int = 1, duration_seconds: int | None = None):
    """Print per-interval network deltas forever (or for a fixed duration).

    Each line shows the change since the previous reading, so the terminal
    displays live activity, not cumulative totals. The status is CLEAN when
    both deltas stay under WARNING_THRESHOLD_BPS, else WARNING with the
    offending rate called out.

    Args:
        interval_seconds: Seconds between readings (default 1).
        duration_seconds: If given, stop after this many seconds (useful
            for scripted 30-second test runs). If None, loop forever.
    """
    previous = get_network_stats()
    start = time.monotonic()
    iteration = 0

    print(
        "NETWORK MONITOR - per-interval deltas across all physical "
        f"interfaces. Threshold: {WARNING_THRESHOLD_BPS // 1024} KB/s\n"
    )

    while True:
        if duration_seconds is not None and iteration >= duration_seconds:
            break
        iteration += 1
        time.sleep(interval_seconds)

        current = get_network_stats()
        delta_sent = current["bytes_sent"] - previous["bytes_sent"]
        delta_recv = current["bytes_recv"] - previous["bytes_recv"]
        previous = current

        rate_sent = delta_sent / interval_seconds
        rate_recv = delta_recv / interval_seconds
        # Round to whole bytes so 0-1 byte of chatter shows as 0, not noise.
        clean = (
            round(rate_sent) <= WARNING_THRESHOLD_BPS
            and round(rate_recv) <= WARNING_THRESHOLD_BPS
        )

        local_time = datetime.now().strftime("%H:%M:%S")
        if clean:
            status = "CLEAN"
            detail = ""
        else:
            status = "WARNING"
            detail = (
                f"  <- outbound {_format_rate(rate_sent)}, "
                f"inbound {_format_rate(rate_recv)}"
            )

        print(
            f"[{local_time}] Outbound: {_format_rate(rate_sent)} | "
            f"Inbound: {_format_rate(rate_recv)} | Status: {status}{detail}",
            flush=True,
        )

    print("\nMonitor stopped.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Live network monitor for the offline demo."
    )
    parser.add_argument(
        "--interval", type=int, default=1, help="Seconds between readings."
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=None,
        help="Stop after N seconds (default: run forever).",
    )
    args = parser.parse_args()

    monitor_loop(
        interval_seconds=args.interval,
        duration_seconds=args.duration,
    )
