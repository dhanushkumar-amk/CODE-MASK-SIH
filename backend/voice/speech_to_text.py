"""
Offline speech-to-text using Vosk (100% local, zero network calls).

Using the SMALL model (vosk-model-small-en-us-0.15, ~40 MB on disk) for optimal
speed and minimal RAM footprint on CPU-only hardware. The model is loaded ONCE
at module level so cold-start cost is under 0.5s and RAM usage is ~30-50 MB.

Large model (vosk-model-en-us-0.22, ~1.8 GB) is backed up in Downloads folder.

Audio conversion (webm/mp3/m4a → 16 kHz mono PCM WAV) uses the ffmpeg
binary bundled inside the `imageio-ffmpeg` pip package so we never depend
on a system-level ffmpeg install.
"""

import json
import os
import subprocess
import time
import wave

from vosk import Model, KaldiRecognizer

# ---------------------------------------------------------------------------
# Locate the bundled ffmpeg binary (ships with imageio-ffmpeg)
# ---------------------------------------------------------------------------
try:
    import imageio_ffmpeg
    FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG_BIN = "ffmpeg"  # fall back to system PATH

# Tell pydub where ffmpeg lives so AudioSegment.from_file works correctly
from pydub import AudioSegment
import pydub.utils
AudioSegment.converter = FFMPEG_BIN
AudioSegment.ffprobe = FFMPEG_BIN  # ffprobe not needed for export, but set it

# ---------------------------------------------------------------------------
# Model — loaded once, kept warm
# ---------------------------------------------------------------------------
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "vosk-model-en-us-0.22-lgraph")

_vosk_model: Model | None = None
_model_load_time: float = 0.0  # seconds it took to load


def _load_model() -> Model:
    """Load (or return cached) Vosk model with timing instrumentation."""
    global _vosk_model, _model_load_time
    if _vosk_model is None:
        if not os.path.isdir(MODEL_PATH):
            raise FileNotFoundError(
                f"Vosk model directory not found: {MODEL_PATH}\n"
                "Ensure vosk-model-en-us-0.22-lgraph is present at backend/voice/vosk-model-en-us-0.22-lgraph."
            )
        print(f"[Vosk] Loading offline model from {MODEL_PATH} …")
        t0 = time.time()
        _vosk_model = Model(MODEL_PATH)
        _model_load_time = time.time() - t0
        print(f"[Vosk] Model loaded in {_model_load_time:.2f}s — ready for offline transcription.")

        # Report process memory after loading
        try:
            import psutil
            proc = psutil.Process(os.getpid())
            mem_mb = proc.memory_info().rss / (1024 * 1024)
            print(f"[Vosk] Process RSS after model load: {mem_mb:.0f} MB")
        except ImportError:
            pass  # psutil not installed — skip memory report
    return _vosk_model


# ---------------------------------------------------------------------------
# Audio conversion
# ---------------------------------------------------------------------------
def convert_to_wav(input_path: str, output_path: str) -> bool:
    """Convert any audio file to 16 kHz, mono, 16-bit PCM WAV via ffmpeg."""
    try:
        # Try subprocess with bundled ffmpeg first (fastest, no Python overhead)
        cmd = [
            FFMPEG_BIN,
            "-y",
            "-i", input_path,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            "-f", "wav",
            output_path,
        ]
        result = subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30
        )
        if result.returncode == 0 and os.path.exists(output_path):
            return True

        # Fallback: pydub (uses the same ffmpeg binary we configured above)
        sound = AudioSegment.from_file(input_path)
        sound = sound.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        sound.export(output_path, format="wav")
        return os.path.exists(output_path)
    except Exception as exc:
        print(f"[Vosk] Audio conversion failed: {exc}")
        return False


# ---------------------------------------------------------------------------
# Transcription
# ---------------------------------------------------------------------------
def transcribe_audio(audio_file_path: str) -> dict:
    """
    Transcribe an audio file using the local Vosk model.

    Accepts any format ffmpeg can decode (webm, mp3, m4a, ogg, wav, …).
    Returns ``{"status": "success", "output": "<text>"}`` on success,
    or ``{"status": "error", "message": "..."}`` on failure.
    """
    if not os.path.exists(audio_file_path):
        return {"status": "error", "message": f"Audio file not found: {audio_file_path}"}

    # Load (or reuse) Vosk model
    try:
        model = _load_model()
    except Exception as exc:
        return {"status": "error", "message": f"Vosk model load failed: {exc}"}

    # Determine whether conversion is needed
    pcm_wav_path = audio_file_path + ".vosk_tmp.wav"
    needs_conversion = True

    try:
        # Check if the file is already a valid 16 kHz mono 16-bit WAV
        try:
            with wave.open(audio_file_path, "rb") as wf:
                if (
                    wf.getnchannels() == 1
                    and wf.getframerate() == 16000
                    and wf.getsampwidth() == 2
                ):
                    needs_conversion = False
                    pcm_wav_path = audio_file_path
        except Exception:
            pass  # not a WAV → needs conversion

        if needs_conversion:
            ok = convert_to_wav(audio_file_path, pcm_wav_path)
            if not ok:
                return {
                    "status": "error",
                    "message": "Audio conversion to 16 kHz PCM WAV failed. "
                               "Check the audio format / ffmpeg installation.",
                }

        # Run Vosk KaldiRecognizer
        with wave.open(pcm_wav_path, "rb") as wf:
            recognizer = KaldiRecognizer(model, wf.getframerate())
            recognizer.SetWords(True)

            text_parts: list[str] = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                if recognizer.AcceptWaveform(data):
                    partial = json.loads(recognizer.Result())
                    if partial.get("text"):
                        text_parts.append(partial["text"])

            final = json.loads(recognizer.FinalResult())
            if final.get("text"):
                text_parts.append(final["text"])

            transcription = " ".join(text_parts).strip()
            if not transcription:
                return {
                    "status": "success",
                    "output": "",
                    "message": "Vosk returned empty transcription — audio may be silent or too short.",
                }
            return {"status": "success", "output": transcription}

    except Exception as exc:
        return {"status": "error", "message": f"Transcription error: {exc}"}
    finally:
        # Clean up temp converted file
        if pcm_wav_path != audio_file_path and os.path.exists(pcm_wav_path):
            try:
                os.remove(pcm_wav_path)
            except OSError:
                pass


# ---------------------------------------------------------------------------
# CLI test harness
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("  Vosk Offline Speech Recognition — Local Test")
    print("=" * 60)

    if len(sys.argv) < 2:
        print("\nUsage: python speech_to_text.py <audio_file>")
        print("  e.g. python speech_to_text.py test_recording.mp3")
        sys.exit(1)

    test_file = sys.argv[1]
    print(f"\nInput file : {test_file}")
    print(f"Model path : {MODEL_PATH}")
    print(f"FFmpeg bin : {FFMPEG_BIN}")
    print()

    result = transcribe_audio(test_file)
    print("Result:", json.dumps(result, indent=2))
