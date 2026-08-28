import time
import requests
import psutil
import json

BASE_URL = "http://127.0.0.1:8000"
AUDIO_FILE = r"c:\SIH 2026\backend\voice\test_recording.mp3"

print("=" * 60)
print(" FASTAPI /VOICE/TRANSCRIBE ENDPOINT TEST")
print("=" * 60)

# 1. Health check
try:
    h = requests.get(f"{BASE_URL}/health", timeout=5)
    print(f"Health Check: {h.status_code} -> {h.json()}")
except Exception as e:
    print(f"Health check failed: {e}")
    exit(1)

# 2. Voice Transcribe request
print(f"\nPosting {AUDIO_FILE} to /voice/transcribe ...")
t0 = time.time()
with open(AUDIO_FILE, "rb") as f:
    files = {"file": ("test_recording.mp3", f, "audio/mpeg")}
    res = requests.post(f"{BASE_URL}/voice/transcribe", files=files, timeout=30)
elapsed = time.time() - t0

print(f"Status Code : {res.status_code}")
print(f"Elapsed Time: {elapsed:.3f} s")
print("Response JSON:")
print(json.dumps(res.json(), indent=2))

print("-" * 60)
# 3. Memory report
vm = psutil.virtual_memory()
print(f"System Total RAM: {vm.total / (1024**3):.2f} GB")
print(f"System Used RAM : {vm.used / (1024**3):.2f} GB ({vm.percent}%)")
print(f"System Avail RAM: {vm.available / (1024**3):.2f} GB")

print("=" * 60)
