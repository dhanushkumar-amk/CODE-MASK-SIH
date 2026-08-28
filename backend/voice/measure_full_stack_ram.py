import time
import requests
import psutil
import json

print("=" * 60)
print(" FULL STACK CONCURRENT RAM & OFFLINE TEST")
print("=" * 60)

# 1. Warm up Ollama qwen2.5:1.5b-instruct
print("[1] Loading Ollama (qwen2.5:1.5b-instruct)...")
try:
    ollama_res = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "qwen2.5:1.5b-instruct", "prompt": "State 'Ollama is warm'", "stream": False},
        timeout=30
    )
    if ollama_res.status_code == 200:
        print("    Ollama Response:", ollama_res.json().get("response", "").strip())
    else:
        print("    Ollama HTTP Error:", ollama_res.status_code)
except Exception as e:
    print(f"    Ollama load error: {e}")

# 2. Test FastAPI /voice/transcribe endpoint
print("\n[2] Testing FastAPI /voice/transcribe endpoint with Small Vosk Model...")
audio_file = r"c:\SIH 2026\backend\voice\test_recording.mp3"
t0 = time.time()
try:
    with open(audio_file, "rb") as f:
        voice_res = requests.post("http://127.0.0.1:8000/voice/transcribe", files={"file": ("test_recording.mp3", f, "audio/mpeg")}, timeout=30)
    print(f"    Transcription Status : {voice_res.status_code} ({time.time() - t0:.2f}s)")
    print(f"    Transcription Output : {json.dumps(voice_res.json())}")
except Exception as e:
    print(f"    FastAPI Voice test error: {e}")

# 3. Process Memory breakdown
print("\n[3] Process Memory (RSS) Breakdown:")
proc_list = []
for proc in psutil.process_iter(["pid", "name"]):
    try:
        pname = proc.info["name"].lower()
        if any(x in pname for x in ["ollama", "python", "node", "chroma", "docker"]):
            mem_mb = proc.memory_info().rss / (1024**2)
            proc_list.append((proc.info['name'], proc.info['pid'], mem_mb))
    except Exception:
        pass

for name, pid, mem_mb in sorted(proc_list, key=lambda x: x[2], reverse=True):
    if mem_mb > 10:
        print(f"    - {name:<25} (PID {pid:<6}): {mem_mb:6.1f} MB")

# 4. Total System Memory Metrics
print("\n[4] Total System Memory Snapshot:")
vm = psutil.virtual_memory()
print(f"    Total System RAM : {vm.total / (1024**3):.2f} GB")
print(f"    Used RAM         : {vm.used / (1024**3):.2f} GB ({vm.percent}%)")
print(f"    Available RAM    : {vm.available / (1024**3):.2f} GB")
print(f"    Real Headroom    : {vm.available / (1024**3):.2f} GB available for Next.js, ChromaDB & Docker sandbox")
print("=" * 60)
