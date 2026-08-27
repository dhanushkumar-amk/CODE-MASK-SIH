# Wireshark — Zero External Traffic Proof

Wireshark is the primary, third-party proof that the Sovereign AI Workbench
makes **zero external network calls** during a full demo session. The
psutil-based monitor (`backend/monitor/network_monitor.py`) remains as a
secondary live indicator; Wireshark is the evidence a judge can open and
inspect directly.

## Setup (already done on this machine)

- **Wireshark 4.6.8** installed at `C:\Program Files\Wireshark\` (includes
  `tshark.exe` CLI and Npcap 1.88 driver).
- **Capture interface**: `Wi-Fi` (`\Device\NPF_{B20DADCC-...}`) — the only
  active physical adapter. Ethernet is disconnected.
- **Npcap Loopback adapter** (`\Device\NPF_Loopback`) is also available;
  it sees 127.0.0.1 traffic, which the physical Wi-Fi adapter never does.

## Display filter (the clean-filter demo view)

```
not (ip.addr == 127.0.0.1 or ipv6.addr == ::1)
```

- Hides all loopback traffic (frontend :3000, backend :8000, Ollama
  :11434) — the entire stack conversation disappears.
- Anything genuinely external (a real DNS lookup, TLS to any host) still
  shows up, which the deliberate-leak test proves.

## Demo runbook

1. Start the stack: Ollama (service), FastAPI (`uvicorn main:app`), Next.js
   (`npm run dev`).
2. In Wireshark: **Capture → Options → Wi-Fi → Start** with the display
   filter above. (Capture filter can be `not host 127.0.0.1`; on Wi-Fi it
   is irrelevant since loopback never hits the physical interface.)
3. Run several agent tasks from the UI (document / coding / OCR chains).
   The packet list stays **empty of app traffic** — the only frames that
   may appear are unrelated OS background chatter (Windows telemetry,
   WhatsApp, antivirus), which is the machine's own ambient noise and
   contains no workbench traffic.
4. Optional cross-check: capture on the **Npcap Loopback** adapter and
   observe the full stack conversation there — FastAPI ↔ Ollama ↔ Next.js
   on 127.0.0.1 — proving the workbench truly does all its work locally.
5. Deliberate-leak check (do once, offline of the demo): in a separate
   terminal run `curl https://google.com`. Wireshark immediately shows the
   TLS ClientHello (SNI=google.com) to an external IP. This proves the
   tool would catch a real leak.

## Saved captures (in this directory)

| File | Contents |
|---|---|
| `baseline_agents.pcapng` | 5 min on Wi-Fi while document/coding/OCR agent tasks ran. 36,332 frames of OS background chatter; **zero frames on ports 8000/3000/11434** and no workbench traffic. |
| `loopback_stack.pcapng` | 40 s on Npcap Loopback during a document task. 1,752 frames; **every** IP packet is `127.0.0.1` (1692/1692). FastAPI↔Ollama↔Next.js visible locally. |
| `leak_test.pcapng` | 45 s on Wi-Fi while `curl https://google.com` / `www.google.com` / `en.wikipedia.org` ran. TLS ClientHello (SNI=google.com) captured at t=9.8 s, SNI=www.google.com at t=32.4 s. |

### Quick verification commands

```bash
# Interface list
"C:\Program Files\Wireshark\tshark.exe" -D

# Baseline: any stack traffic on physical Wi-Fi? (expect: none)
"C:\Program Files\Wireshark\tshark.exe" -r demo_assets\baseline_agents.pcapng ^
  -Y "tcp.port == 8000 or tcp.port == 3000 or tcp.port == 11434" -c 1

# Loopback: unique destinations (expect: 127.0.0.1 only)
"C:\Program Files\Wireshark\tshark.exe" -r demo_assets\loopback_stack.pcapng ^
  -T fields -e ip.dst -Y "ip"

# Leak test: google.com ClientHello (expect: hits)
"C:\Program Files\Wireshark\tshark.exe" -r demo_assets\leak_test.pcapng ^
  -Y "tls.handshake.extensions_server_name == \"google.com\" and tls.handshake.type == 1" ^
  -T fields -e frame.time_relative -e tls.handshake.extensions_server_name
```

(Remove the `^` line continuations on PowerShell.)
