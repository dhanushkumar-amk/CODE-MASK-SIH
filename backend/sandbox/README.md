# Sandboxed Code Execution

Isolated execution environment for agent-submitted Python code. The container
runs **standard-library-only Python 3.11** as a **non-root user** with **zero
network access** and hard **resource limits**.

## Build (once, while internet is available)

```sh
docker build -t offline-code-sandbox backend/sandbox/
```

The image is ~45MB content size. No `pip`/`apt` steps exist, so nothing else
needs internet after the one-time base-image pull.

## Canonical run template

This is the exact command the agent's sandbox tool uses (Windows host,
PowerShell/cmd — use `subprocess.run` with `timeout=` programmatically):

```text
docker run --rm \
  --network none \                      # no connectivity: outbound/inbound blocked at the kernel
  --memory=128m \                       # hard cap; OOM-killed (exit 137) if exceeded
  --cpus=0.5 \                          # CPU throttle; runaway loop runs slow but bounded
  --pids-limit=64 \                     # fork-bomb guard
  --user sandbox \                      # non-root (also the image default)
  --read-only \                         # immutable filesystem (omit only if code must write /sandbox)
  --tmpfs /tmp:size=16m \               # scratch space when --read-only is used
  -v "<host_workdir>:/sandbox" \        # code in / out
  --name sandbox-run-<id> \             # unique name so timeout cleanup can remove by name
  offline-code-sandbox python3 /sandbox/script.py
```

### Host-level timeout (required — Docker CLI has no `--timeout`)

Windows has no GNU `timeout` (`C:\Windows\System32\timeout.exe` only sleeps).
The wrapper pattern, which the sandbox tool implements:

```python
import subprocess, uuid

def run_sandbox(host_dir: str, script: str, timeout_s: float = 10.0) -> dict:
    name = f"sandbox-{uuid.uuid4().hex[:8]}"
    cmd = [
        "docker", "run", "--rm", "--name", name,
        "--network", "none", "--memory=128m", "--cpus=0.5",
        "--pids-limit=64", "--user", "sandbox", "--read-only",
        "--tmpfs", "/tmp:size=16m",
        "-v", f"{host_dir}:/sandbox",
        "offline-code-sandbox", "python3", f"/sandbox/{script}",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    try:
        out, _ = proc.communicate(timeout=timeout_s)
        return {"status": "success" if proc.returncode == 0 else "error",
                "exit_code": proc.returncode,
                "output": out.decode(errors="replace")[:8000]}
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        # On Windows killing the CLI does NOT stop the container — remove by name.
        subprocess.run(["docker", "rm", "-f", name], capture_output=True)
        return {"status": "timeout", "exit_code": None,
                "output": f"timed out after {timeout_s}s; container removed"}
```

**Why the cleanup matters:** on Windows, killing the `docker` CLI process
leaves the container running detached. The `--name` + `docker rm -f <name>`
in the `TimeoutExpired` branch is what actually stops a runaway script.

## Verified behavior

| Check | Command | Result |
|---|---|---|
| Build | `docker build -t offline-code-sandbox backend/sandbox/` | Success, image listed in `docker images` |
| Offline run | `docker run --rm --network none offline-code-sandbox python3 -c "print('sandbox works offline')"` | `sandbox works offline` |
| Non-root | `docker run --rm offline-code-sandbox whoami` | `sandbox` |
| Network blocked | in-container socket probe (IP + DNS) | `Errno 101 Network is unreachable` / `gaierror -3` on all |
| Memory cap | `--memory=128m` + 16MB-alloc loop | OOM-killed, exit 137, at 224MB allocated |
| CPU cap | `--cpus=0.5` vs `--cpus=1.0`, fixed-work loop | 25.9s vs 12.0s (2.2× slower) |
| Timeout | 10s wrapper vs infinite loop | killed at 10.0s, container removed, no leftovers |
| Fork bomb | `--pids-limit=64` | `BlockingIOError: Resource temporarily unavailable` |

## Notes

- `--network none` is kernel-enforced — stronger than relying on the host's
  Wi-Fi being off. A container with no network namespace cannot reach the
  host network, LAN, or internet, regardless of host adapter state.
- `--read-only` is recommended; mount a writeable `--tmpfs /tmp` so scripts
  that need temp files still work.
- The `sandbox` user has UID 10001 inside the container; combined with
  `--read-only`, a compromised script can't write the image filesystem.
