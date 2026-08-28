import os
import subprocess
import wave
import struct
import math

def create_tts_wav(output_wav_path: str, text: str):
    # Use PowerShell System.Speech via script file or com object
    ps_script = f"""
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile('{output_wav_path}')
$synth.Speak('{text}')
$synth.Dispose()
"""
    ps_file = output_wav_path + ".ps1"
    with open(ps_file, "w", encoding="utf-8") as f:
        f.write(ps_script)
    
    subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", ps_file], check=True)
    if os.path.exists(ps_file):
        os.remove(ps_file)
    print(f"Generated WAV audio: {output_wav_path}")

if __name__ == "__main__":
    wav_path = os.path.join(os.path.dirname(__file__), "test_recording.wav")
    mp3_path = os.path.join(os.path.dirname(__file__), "test_recording.mp3")
    create_tts_wav(wav_path, "Hello this is a test recording for Vosk speech recognition performance, load time, and accuracy benchmarking.")
    
    # Also convert to MP3 using ffmpeg
    from speech_to_text import FFMPEG_BIN
    subprocess.run([FFMPEG_BIN, "-y", "-i", wav_path, mp3_path], check=True)
    print(f"Converted to MP3: {mp3_path}")
