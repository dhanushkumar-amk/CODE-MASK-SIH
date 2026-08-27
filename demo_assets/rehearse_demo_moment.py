"""Rehearsal automation script for live demo disconnection sequence.

This script tests and logs the exact timeline of:
1. Triggering Task 1: Scan-to-Word (OCR -> DOCX generation).
2. Streaming step progress with timestamps.
3. Completing Task 1 offline/online.
4. Immediately starting Task 2 (Fresh Task from scratch).
5. Completing Task 2 and outputting exact timing stats.
"""

import json
import time
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000"

def stream_agent_task(goal: str, task_name: str):
    print(f"\n--- Starting {task_name} ---")
    print(f"Goal: {goal}")
    start_time = time.time()
    
    url = f"{BASE_URL}/agent/run/stream"
    req = urllib.request.Request(
        url,
        data=json.dumps({"goal": goal}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        response = urllib.request.urlopen(req, timeout=120)
        events = []
        
        while True:
            line = response.readline()
            if not line:
                break
            decoded = line.decode("utf-8")
            if decoded.startswith("data: "):
                data_json = decoded[6:].strip()
                if data_json:
                    try:
                        event = json.loads(data_json)
                        t_rel = round(time.time() - start_time, 2)
                        events.append((t_rel, event))
                        evt_type = event.get("event", "unknown")
                        print(f"[{t_rel:5.2f}s] Event: {evt_type}")
                        if evt_type == "plan_ready":
                            print(f"        Plan: {event.get('plan')}")
                        elif evt_type == "step_complete":
                            res = event.get("step_result", {})
                            print(f"        Step Complete: {res.get('step')} -> {res.get('status')}")
                        elif evt_type == "done":
                            print(f"        Final Output: {event.get('result', {}).get('output')}")
                    except Exception as e:
                        print(f"        Error parsing event: {e}")
            time.sleep(0.01)
            
        total_time = round(time.time() - start_time, 2)
        print(f"--- Completed {task_name} in {total_time}s ---")
        return total_time, events
    except urllib.error.URLError as exc:
        print(f"URLError in {task_name}: {exc}")
        return None, []
    except Exception as exc:
        print(f"Error in {task_name}: {exc}")
        return None, []

def run_rehearsal_suite():
    print("=== SOVEREIGN AI WORKBENCH - DEMO REHEARSAL BENCHMARK ===")
    
    # Task 1: Scan to Word
    goal1 = "Extract text from test_scan.png and generate an approval note Word document"
    t1, evts1 = stream_agent_task(goal1, "Task 1 (Scan-to-Word)")
    
    # Task 2: Fresh Task from scratch
    goal2 = "Write and execute a Python script to compute Fibonacci sequence up to 10"
    t2, evts2 = stream_agent_task(goal2, "Task 2 (Fresh Task: Code Execution)")
    
    print("\n================ REHEARSAL SUMMARY ================")
    print(f"Task 1 (Scan-to-Word): {t1}s")
    print(f"Task 2 (Code Exec):    {t2}s")
    print(f"Total Sequence Duration: {round(t1 + t2, 2)}s")

if __name__ == "__main__":
    run_rehearsal_suite()
