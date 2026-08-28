import sys
import os
import psutil
import requests
import time

print("=" * 60)
print(" SYSTEM & STACK RAM CHECK")
print("=" * 60)

vm = psutil.virtual_memory()
print(f"Total System RAM : {vm.total / (1024**3):.2f} GB")
print(f"Used RAM         : {vm.used / (1024**3):.2f} GB ({vm.percent}%)")
print(f"Available RAM    : {vm.available / (1024**3):.2f} GB")
print("-" * 60)

# Check Ollama
print("\n[1] Checking Ollama Service (qwen2.5:1.5b-instruct)...")
try:
    resp = requests.get("http://localhost:11434/api/tags", timeout=3)
    if resp.status_code == 200:
        models = [m['name'] for m in resp.json().get('models', [])]
        print(f"    Ollama is RUNNING. Installed models: {models}")
        # Trigger warm load of qwen2.5:1.5b-instruct
        print("    Warming up qwen2.5:1.5b-instruct in Ollama...")
        gen = requests.post("http://localhost:11434/api/generate", json={
            "model": "qwen2.5:1.5b-instruct",
            "prompt": "hi",
            "stream": False
        }, timeout=15)
        print("    Ollama model loaded successfully.")
    else:
        print(f"    Ollama returned HTTP {resp.status_code}")
except Exception as e:
    print(f"    Ollama check note: {e}")

# Check processes
print("\n[2] Process RAM Breakdown:")
for proc in psutil.process_iter(["name", "pid"]):
    try:
        pname = proc.info["name"].lower()
        if any(x in pname for x in ["ollama", "python", "node", "chroma", "docker"]):
            mem_mb = proc.memory_info().rss / (1024**2)
            if mem_mb > 15:
                print(f"    - {proc.info['name']} (PID {proc.info['pid']}): {mem_mb:.1f} MB")
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        pass

vm_after = psutil.virtual_memory()
print("-" * 60)
print(f"Final Total RAM Used  : {vm_after.used / (1024**3):.2f} GB / {vm_after.total / (1024**3):.2f} GB ({vm_after.percent}%)")
print(f"Final Available RAM   : {vm_after.available / (1024**3):.2f} GB")
print("=" * 60)
