import sys, os, time, json
sys.path.insert(0, r"c:\SIH 2026\backend")

print("=" * 60)
print("  LARGE MODEL LOAD TEST")
print("=" * 60)

# Load model with timing
t0 = time.time()
from voice.speech_to_text import _load_model, MODEL_PATH, FFMPEG_BIN
model = _load_model()
load_time = time.time() - t0
print(f"\nTotal import+load time: {load_time:.1f}s")

# System-wide memory
import psutil
vm = psutil.virtual_memory()
print(f"\n--- System Memory ---")
print(f"Total RAM  : {vm.total / (1024**3):.1f} GB")
print(f"Used       : {vm.used / (1024**3):.1f} GB ({vm.percent}%)")
print(f"Available  : {vm.available / (1024**3):.1f} GB")
proc_rss = psutil.Process(os.getpid()).memory_info().rss / (1024**2)
print(f"This process (Vosk) RSS: {proc_rss:.0f} MB")

# Check Ollama memory usage
print("\n--- Ollama Processes ---")
found = False
for proc in psutil.process_iter(["name", "pid"]):
    pname = proc.info["name"].lower()
    if "ollama" in pname:
        found = True
        try:
            mem = proc.memory_info().rss / (1024**2)
            pid = proc.info["pid"]
            print(f"  {pname} (PID {pid}): {mem:.0f} MB")
        except Exception:
            pass
if not found:
    print("  (no Ollama processes found)")

# Combined estimate
print(f"\n--- Combined Estimate ---")
print(f"Vosk model RSS: {proc_rss:.0f} MB")
print(f"System used: {vm.used / (1024**3):.1f} GB / {vm.total / (1024**3):.1f} GB")
avail_gb = vm.available / (1024**3)
if avail_gb < 2.0:
    print(f"WARNING: Only {avail_gb:.1f} GB available — swap risk during demo!")
elif avail_gb < 4.0:
    print(f"CAUTION: {avail_gb:.1f} GB available — tight but workable")
else:
    print(f"OK: {avail_gb:.1f} GB available — should be fine")
