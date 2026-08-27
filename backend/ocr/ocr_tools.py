"""OCR extraction tools, sandboxed to backend/workspace/.

Multimodal input without a vision model: Tesseract extracts text from
scans/images first, and the extracted text is then fed to the text model.
Supports image OCR (png/jpg/jpeg) and scanned-PDF OCR (pdf2image +
Tesseract per page).

System dependencies:
  - Tesseract binary (pytesseract needs it):
      Windows: install from https://github.com/UB-Mannheim/tesseract/wiki
      Linux:   sudo apt install tesseract-ocr
  - poppler-utils (pdf2image needs it, PDF path only):
      Linux:   sudo apt install poppler-utils
      macOS:   brew install poppler
      Windows: install poppler and add its bin/ to PATH, or skip PDF OCR
"""

import re
import sys
from pathlib import Path

# Make `tools` importable both when this module is imported by the app
# (backend on sys.path) and when run directly (backend/ocr on sys.path).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools.file_tools import WORKSPACE_DIR, _resolve_safe  # noqa: E402

try:
    import pytesseract
    from PIL import Image, ImageOps
except ImportError:
    pytesseract = None
    Image = None
    ImageOps = None

try:
    from pdf2image import convert_from_path
except ImportError:
    convert_from_path = None

try:
    import pypdf
except ImportError:
    pypdf = None

# Tesseract binary lives outside the venv on Windows; point pytesseract at
# the common install location if it isn't already on PATH.
if pytesseract is not None and sys.platform == "win32":
    TESSERACT_EXE = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
    if TESSERACT_EXE.exists():
        pytesseract.pytesseract.tesseract_cmd = str(TESSERACT_EXE)

SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg"}


def _clean_ocr_text(text: str) -> str:
    """Strip excessive whitespace/blank lines from raw OCR output."""
    text = text.strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def _prepare_image_for_ocr(image: Image.Image) -> list[Image.Image]:
    """Prepare PIL Image variants for OCR to maximize text extraction success.

    Small images (<800px), palette/RGBA modes, or low-contrast images cause
    raw Tesseract to fail. Converts modes over a clean white background,
    upscales low-res images, and produces grayscale + inverted variants.
    """
    variants = []

    # 1. Convert palette/alpha modes to clean RGB over white background
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        bg = Image.new("RGB", image.size, (255, 255, 255))
        rgba = image.convert("RGBA")
        bg.paste(rgba, mask=rgba.split()[3])
        base_rgb = bg
    else:
        base_rgb = image.convert("RGB")

    # 2. Upscale low-resolution images (< 800px max dimension)
    max_dim = max(base_rgb.width, base_rgb.height)
    if max_dim < 800 and max_dim > 0:
        scale = max(2, min(5, int(800 / max_dim)))
        new_size = (base_rgb.width * scale, base_rgb.height * scale)
        upscaled_rgb = base_rgb.resize(new_size, Image.LANCZOS)
    else:
        upscaled_rgb = base_rgb

    # Add upscaled RGB
    variants.append(upscaled_rgb)

    # Add Grayscale & Auto-contrast
    if ImageOps is not None:
        gray = ImageOps.grayscale(upscaled_rgb)
        auto_gray = ImageOps.autocontrast(gray)
        variants.append(gray)
        variants.append(auto_gray)

        # Thresholding / binarization variants for stylized/cursive font separation
        thresh_130 = auto_gray.point(lambda p: 255 if p > 130 else 0)
        thresh_160 = auto_gray.point(lambda p: 255 if p > 160 else 0)
        variants.append(thresh_130)
        variants.append(thresh_160)

        # Add Inverted Grayscale (for white-on-dark text)
        try:
            inverted = ImageOps.invert(auto_gray)
            variants.append(inverted)
        except Exception:
            pass

    return variants


def _score_ocr_candidate(text: str) -> float:
    """Score OCR text candidate by word count, readability, and penalty for non-alphanumeric noise."""
    words = re.findall(r"\b[a-zA-Z0-9']{2,}\b", text)
    alpha = sum(1 for c in text if c.isalnum())
    noise = sum(15 for c in text if ord(c) > 127 or c in "^~`|<>[]{}%\\")
    return (len(words) * 25) + alpha - noise


def _ocr_image(image: Image.Image) -> str:
    """Run Tesseract across preprocessed variants and select the candidate with maximum quality score."""
    if pytesseract is None:
        return ""

    candidates = []

    # 1. Quick raw OCR candidate
    try:
        raw_text = pytesseract.image_to_string(image)
        cleaned = _clean_ocr_text(raw_text)
        if cleaned:
            candidates.append(cleaned)
    except Exception:
        pass

    # 2. Preprocessed image variants across Page Segmentation Modes
    for psm in (3, 6, 11):
        config = f"--psm {psm}"
        for variant in _prepare_image_for_ocr(image):
            try:
                text = pytesseract.image_to_string(variant, config=config)
                cleaned = _clean_ocr_text(text)
                if cleaned:
                    candidates.append(cleaned)
            except Exception:
                continue

    if not candidates:
        return ""

    # Sort candidates by quality score to pick the most readable, complete extraction
    candidates.sort(key=_score_ocr_candidate, reverse=True)
    return candidates[0]


def _resolve_file_arg(image_path=None, pdf_path=None, path=None, file_path=None, file=None) -> str | None:
    """Resolve target path string from any common parameter key used by LLMs."""
    for candidate in (image_path, pdf_path, path, file_path, file):
        if candidate and isinstance(candidate, str) and candidate.strip():
            return candidate.strip()
    return None


def extract_text_from_image(
    image_path: str = None,
    pdf_path: str = None,
    path: str = None,
    file_path: str = None,
    file: str = None,
) -> dict:
    """Run OCR/extraction on an image or vector file in the workspace.

    Handles PNG, JPG, JPEG, SVG, and automatically routes .pdf files to PDF extraction.
    """
    target = _resolve_file_arg(image_path, pdf_path, path, file_path, file)
    if not target:
        return {"status": "error", "output": "No file path provided."}

    safe_path = _resolve_safe(target)
    if safe_path is None:
        return {
            "status": "error",
            "output": f"Path rejected (must stay inside the workspace): {target!r}",
        }

    if safe_path.suffix.lower() == ".pdf":
        return extract_text_from_pdf(pdf_path=target)

    if safe_path.suffix.lower() not in SUPPORTED_IMAGE_EXTENSIONS:
        return {
            "status": "error",
            "output": (
                f"Unsupported image format: {safe_path.suffix}. "
                f"Supported: {', '.join(sorted(SUPPORTED_IMAGE_EXTENSIONS | {'.pdf'}))}"
            ),
        }

    if not safe_path.exists():
        return {"status": "error", "output": f"Image not found: {target}"}

    # SVG files are text-based XML: extract text labels directly from tags.
    if safe_path.suffix.lower() == ".svg":
        try:
            raw_svg = safe_path.read_text(encoding="utf-8")
            matches = re.findall(r">([^<]+)<", raw_svg)
            extracted = " ".join(m.strip() for m in matches if m.strip())
            if not extracted:
                extracted = re.sub(r"<[^>]+>", " ", raw_svg).strip()
                extracted = re.sub(r"\s+", " ", extracted)
            extracted = _clean_ocr_text(extracted)
            if not extracted:
                return {
                    "status": "error",
                    "output": "SVG contains no text content.",
                }
            return {
                "status": "success",
                "output": extracted,
                "char_count": len(extracted),
            }
        except Exception as exc:
            return {"status": "error", "output": f"Could not read SVG file: {exc}"}

    if pytesseract is None or Image is None:
        return {
            "status": "error",
            "output": "pytesseract/Pillow not installed. Run: "
            "pip install pytesseract pillow",
        }

    try:
        with Image.open(safe_path) as image:
            text = _ocr_image(image)
    except pytesseract.TesseractNotFoundError:
        return {
            "status": "error",
            "output": (
                "Tesseract binary not found. Install tesseract-ocr or set "
                "pytesseract.pytesseract.tesseract_cmd."
            ),
        }
    except Exception as exc:  # noqa: BLE001 - OCR errors must not crash.
        return {"status": "error", "output": f"OCR failed: {exc}"}

    text = _clean_ocr_text(text)
    if not text:
        return {
            "status": "error",
            "output": "OCR produced no text (blank or unreadable image?).",
        }

    return {"status": "success", "output": text, "char_count": len(text)}


def extract_text_from_pdf(
    pdf_path: str = None,
    image_path: str = None,
    path: str = None,
    file_path: str = None,
    file: str = None,
) -> dict:
    """Extract text from a PDF file in the workspace.

    Uses pypdf for direct text extraction first. If the PDF is image-based (scanned),
    falls back to pdf2image + Tesseract OCR per page. Automatically routes image formats.
    """
    target = _resolve_file_arg(pdf_path, image_path, path, file_path, file)
    if not target:
        return {"status": "error", "output": "No PDF file path provided."}

    safe_path = _resolve_safe(target)
    if safe_path is None:
        return {
            "status": "error",
            "output": f"Path rejected (must stay inside the workspace): {target!r}",
        }

    if safe_path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS:
        return extract_text_from_image(image_path=target)

    if not safe_path.exists():
        return {"status": "error", "output": f"PDF not found: {target}"}

    # Attempt 1: Fast direct text extraction using pypdf.
    if pypdf is not None:
        try:
            reader = pypdf.PdfReader(str(safe_path))
            extracted_pages = []
            for index, page in enumerate(reader.pages, 1):
                page_text = _clean_ocr_text(page.extract_text() or "")
                if page_text:
                    extracted_pages.append(f"--- Page {index} ---\n{page_text}")
            if extracted_pages:
                full_text = "\n\n".join(extracted_pages)
                return {
                    "status": "success",
                    "output": full_text,
                    "char_count": len(full_text),
                }
        except Exception:
            pass

    # Attempt 2: Image-based scanned PDF rasterization + OCR via pdf2image + Tesseract.
    if convert_from_path is None:
        return {
            "status": "error",
            "output": (
                "Could not extract text layer from PDF and pdf2image is not installed. "
                "Run: pip install pdf2image pypdf"
            ),
        }

    try:
        pages = convert_from_path(str(safe_path))
    except Exception as exc:  # noqa: BLE001
        return {
            "status": "error",
            "output": f"Could not convert PDF pages: {exc}",
        }

    page_texts = []
    for index, page_image in enumerate(pages, 1):
        page_text = _clean_ocr_text(_ocr_image(page_image))
        if page_text:
            page_texts.append(f"--- Page {index} ---\n{page_text}")

    if not page_texts:
        return {
            "status": "error",
            "output": "OCR produced no text from any PDF page.",
        }

    full_text = "\n\n".join(page_texts)
    return {"status": "success", "output": full_text, "char_count": len(full_text)}


if __name__ == "__main__":
    # Generate a clean printed-text test scan, then OCR it back.
    from PIL import Image, ImageDraw, ImageFont

    TEST_TEXT = (
        "Inspection Report - Joint A-12 shows minor corrosion. "
        "Recommend maintenance within 30 days."
    )
    IMAGE_PATH = WORKSPACE_DIR / "test_scan.png"

    # White background, black text, large default font for clean OCR.
    # Wide canvas so the full sentence fits without wrapping/clipping.
    image = Image.new("RGB", (1600, 200), "white")
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("arial.ttf", 28)
    except OSError:
        font = ImageFont.load_default()
    draw.text((20, 70), TEST_TEXT, fill="black", font=font)
    image.save(IMAGE_PATH)
    print(f"Generated test scan: {IMAGE_PATH}\n")

    print(f"OCR on {IMAGE_PATH.name}:")
    result = extract_text_from_image("test_scan.png")
    print(f"  status: {result['status']}")
    if result["status"] == "success":
        print(f"  extracted: {result['output']!r}")
        print(f"  char_count: {result['char_count']}")
        print(f"\n  Expected : {TEST_TEXT!r}")
        print(
            f"  Match    : {result['output'].lower() == TEST_TEXT.lower()}"
        )
    else:
        print(f"  error: {result['output']}")

    print("\nError-path checks:")
    print(f"  missing file -> {extract_text_from_image('nope.png')}")
    print(f"  bad format   -> {extract_text_from_image('test.txt')}")
