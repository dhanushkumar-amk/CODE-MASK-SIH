import sys
import os
import time
import json
import psutil
from vosk import Model, KaldiRecognizer
import wave

sys.path.insert(0, r"c:\SIH 2026\backend")
from voice.speech_to_text import convert_to_wav, transcribe_audio, MODEL_PATH as SMALL_MODEL_PATH

LARGE_MODEL_PATH = r"C:\Users\mi127\Downloads\vosk-model-en-us-0.22\vosk-model-en-us-0.22"
if not os.path.exists(LARGE_MODEL_PATH):
    LARGE_MODEL_PATH = r"C:\Users\mi127\Downloads\vosk-model-en-us-0.22"

AUDIO_FILE = os.path.join(os.path.dirname(__file__), "test_recording.mp3")

def run_transcribe(model: Model, audio_path: str) -> str:
    wav_path = audio_path + ".bench_tmp.wav"
    try:
        convert_to_wav(audio_path, wav_path)
        with wave.open(wav_path, "rb") as wf:
            rec = KaldiRecognizer(model, wf.getframerate())
            rec.SetWords(True)
            text_parts = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                if rec.AcceptWaveform(data):
                    res = json.loads(rec.Result())
                    if res.get("text"):
                        text_parts.append(res["text"])
            final = json.loads(rec.FinalResult())
            if final.get("text"):
                text_parts.append(final["text"])
            return " ".join(text_parts).strip()
    finally:
        if os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except OSError:
                pass

def benchmark_model(name: str, path: str):
    print("=" * 60)
    print(f" BENCHMARK: {name}")
    print(f" Model Path: {path}")
    print("=" * 60)
    
    if not os.path.exists(path):
        print(f"ERROR: Path {path} does not exist!")
        return None
        
    proc_before = psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024)
    t0 = time.time()
    model = Model(path)
    load_time = time.time() - t0
    proc_after = psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024)
    mem_diff = proc_after - proc_before
    
    print(f"Load Time       : {load_time:.3f} s")
    print(f"Process RSS     : {proc_after:.1f} MB (added ~{mem_diff:.1f} MB)")
    
    t_trans0 = time.time()
    output_text = run_transcribe(model, AUDIO_FILE)
    trans_time = time.time() - t_trans0
    
    print(f"Transcription Time: {trans_time:.3f} s")
    print(f"Transcription Text: \"{output_text}\"")
    print()
    return {
        "name": name,
        "load_time_sec": load_time,
        "rss_mb": proc_after,
        "mem_added_mb": mem_diff,
        "transcription_time_sec": trans_time,
        "output_text": output_text
    }

if __name__ == "__main__":
    print(f"Audio File: {AUDIO_FILE}")
    small_res = benchmark_model("Small Model (vosk-model-small-en-us-0.15)", SMALL_MODEL_PATH)
    large_res = benchmark_model("Large Model (vosk-model-en-us-0.22)", LARGE_MODEL_PATH)
    
    print("=" * 60)
    print(" SUMMARY COMPARISON")
    print("=" * 60)
    if small_res and large_res:
        speedup = large_res['load_time_sec'] / small_res['load_time_sec'] if small_res['load_time_sec'] > 0 else 0
        mem_savings = large_res['mem_added_mb'] - small_res['mem_added_mb']
        print(f"Load Speedup    : {speedup:.1f}x faster cold start with small model ({small_res['load_time_sec']:.2f}s vs {large_res['load_time_sec']:.2f}s)")
        print(f"RAM Savings     : ~{mem_savings:.1f} MB RAM saved ({small_res['mem_added_mb']:.1f} MB vs {large_res['mem_added_mb']:.1f} MB added RSS)")
        print(f"Small Output    : {small_res['output_text']}")
        print(f"Large Output    : {large_res['output_text']}")
