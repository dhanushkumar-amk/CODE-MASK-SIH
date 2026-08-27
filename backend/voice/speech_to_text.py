import os
import wave
import json
import subprocess
from vosk import Model, KaldiRecognizer

# Path to local Vosk model
MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, "vosk-model-small-en-us-0.15")

_vosk_model = None

def load_vosk_model():
    """Loads the Vosk model once at module initialization to keep it warm."""
    global _vosk_model
    if _vosk_model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Vosk model not found at {MODEL_PATH}. "
                f"Ensure vosk-model-small-en-us-0.15 is downloaded."
            )
        print(f"[Vosk] Loading offline model from: {MODEL_PATH}")
        _vosk_model = Model(MODEL_PATH)
        print("[Vosk] Offline speech recognition model loaded successfully.")
    return _vosk_model

def convert_to_pcm_wav(input_path: str, output_path: str) -> bool:
    """Converts input audio file to 16kHz Mono 16-bit PCM WAV required by Vosk."""
    try:
        # Use ffmpeg if available or pydub fallback
        cmd = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            output_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode == 0 and os.path.exists(output_path):
            return True

        # Fallback using pydub
        from pydub import AudioSegment
        sound = AudioSegment.from_file(input_path)
        sound = sound.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        sound.export(output_path, format="wav")
        return os.path.exists(output_path)
    except Exception as e:
        print(f"[Vosk] Audio conversion error: {e}")
        return False

def transcribe_audio(audio_file_path: str) -> dict:
    """
    Transcribes audio file using local Vosk model.
    Accepts any audio file format, converts to 16kHz mono 16-bit PCM WAV if needed.
    Returns {"status": "success", "output": "<text>"} or error dict.
    """
    if not os.path.exists(audio_file_path):
        return {"status": "error", "message": f"Audio file missing: {audio_file_path}"}

    try:
        model = load_vosk_model()
    except Exception as e:
        return {"status": "error", "message": f"Failed to load Vosk model: {str(e)}"}

    # Prepare 16kHz PCM WAV file path
    pcm_wav_path = audio_file_path + "_converted.wav"
    try:
        # Check if already valid 16kHz mono wav
        needs_conversion = True
        try:
            with wave.open(audio_file_path, "rb") as wf:
                if wf.getnchannels() == 1 and wf.getframerate() == 16000 and wf.getsampwidth() == 2:
                    needs_conversion = False
                    pcm_wav_path = audio_file_path
        except Exception:
            needs_conversion = True

        if needs_conversion:
            success = convert_to_pcm_wav(audio_file_path, pcm_wav_path)
            if not success:
                return {"status": "error", "message": "Failed to convert audio to 16kHz PCM WAV"}

        # Perform Vosk Kaldi Recognition
        with wave.open(pcm_wav_path, "rb") as wf:
            rec = KaldiRecognizer(model, wf.getframerate())
            rec.SetWords(True)

            results = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                if rec.AcceptWaveform(data):
                    part = json.loads(rec.Result())
                    if part.get("text"):
                        results.append(part["text"])

            final_part = json.loads(rec.FinalResult())
            if final_part.get("text"):
                results.append(final_part["text"])

            transcription = " ".join(results).strip()
            return {
                "status": "success",
                "output": transcription
            }
    except Exception as e:
        return {"status": "error", "message": f"Transcription error: {str(e)}"}
    finally:
        # Cleanup converted temp file if created
        if pcm_wav_path != audio_file_path and os.path.exists(pcm_wav_path):
            try:
                os.remove(pcm_wav_path)
            except Exception:
                pass

if __name__ == "__main__":
    import sys
    print("Testing Vosk offline speech recognition...")
    if len(sys.argv) > 1:
        test_path = sys.argv[1]
        res = transcribe_audio(test_path)
        print("Transcription Result:", json.dumps(res, indent=2))
    else:
        print("Provide a audio file path to test: python speech_to_text.py <audio.wav>")
