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
    from PIL import Image
except ImportError:
    pytesseract = None
    Image = None

try:
    from pdf2image import convert_from_path
except ImportError:
    convert_from_path = None

# Tesseract binary lives outside the venv on Windows; point pytesseract at
# the common install location if it isn't already on PATH.
if pytesseract is not None and sys.platform == "win32":
    TESSERACT_EXE = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
    if TESSERACT_EXE.exists():
        pytesseract.pytesseract.tesseract_cmd = str(TESSERACT_EXE)

SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}


def _clean_ocr_text(text: str) -> str:
    """Strip excessive whitespace/blank lines from raw OCR output.

    Tesseract often emits leading/trailing whitespace and double blank
    lines; collapsing them makes the text cleaner for the text model.
    """
    text = text.strip()
    # Collapse 3+ newlines into 2, so paragraphs keep one blank line.
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def _ocr_image(image: Image.Image) -> str:
    """Run Tesseract on an in-memory PIL image."""
    return pytesseract.image_to_string(image)


def extract_text_from_image(image_path: str) -> dict:
    """Run OCR on an image file in the workspace.

    Args:
        image_path: Path relative to backend/workspace/ (png/jpg/jpeg).

    Returns:
        {"status": "success", "output": "<extracted text>",
         "char_count": <int>} on success, or
        {"status": "error", "output": "<clear message>"} if the file is
        missing, an unsupported format, or OCR produced empty text.
        Never raises.
    """
    if pytesseract is None or Image is None:
        return {
            "status": "error",
            "output": "pytesseract/Pillow not installed. Run: "
            "pip install pytesseract pillow",
        }

    safe_path = _resolve_safe(image_path)
    if safe_path is None:
        return {
            "status": "error",
            "output": f"Path rejected (must stay inside the workspace): {image_path!r}",
        }

    if safe_path.suffix.lower() not in SUPPORTED_IMAGE_EXTENSIONS:
        return {
            "status": "error",
            "output": (
                f"Unsupported image format: {safe_path.suffix}. "
                f"Supported: {', '.join(sorted(SUPPORTED_IMAGE_EXTENSIONS))}"
            ),
        }

    if not safe_path.exists():
        return {"status": "error", "output": f"Image not found: {image_path}"}

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


def extract_text_from_pdf(pdf_path: str) -> dict:
    """Run OCR on a scanned (image-based) PDF, page by page.

    Scanned PDFs have no embedded text layer, so each page is rasterized
    with pdf2image and then OCR'd. Page results are concatenated with
    "--- Page N ---" markers.

    Args:
        pdf_path: Path relative to backend/workspace/.

    Returns:
        Same structure as extract_text_from_image(), covering all pages.
    """
    if convert_from_path is None:
        return {
            "status": "error",
            "output": (
                "pdf2image is not installed. Run: pip install pdf2image\n"
                "pdf2image also needs poppler-utils:\n"
                "  Linux:   sudo apt install poppler-utils\n"
                "  macOS:   brew install poppler\n"
                "  Windows: install poppler and add its bin/ to PATH"
            ),
        }

    safe_path = _resolve_safe(pdf_path)
    if safe_path is None:
        return {
            "status": "error",
            "output": f"Path rejected (must stay inside the workspace): {pdf_path!r}",
        }

    if not safe_path.exists():
        return {"status": "error", "output": f"PDF not found: {pdf_path}"}

    try:
        pages = convert_from_path(str(safe_path))
    except Exception as exc:  # noqa: BLE001
        # Most commonly: poppler-utils missing from the system.
        return {
            "status": "error",
            "output": (
                f"Could not convert PDF pages: {exc}\n"
                "pdf2image requires poppler-utils:\n"
                "  Linux:   sudo apt install poppler-utils\n"
                "  macOS:   brew install poppler\n"
                "  Windows: install poppler and add its bin/ to PATH"
            ),
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
