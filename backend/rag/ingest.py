"""Ingestion pipeline: real SOP/manual documents -> knowledge base chunks.

Reads plain-text documents from backend/workspace/sop_documents/ (or any
workspace path), chunks them with sentence-boundary-aware overlap, and
stores them in the ChromaDB vector store via add_documents().
"""

import re
import sys
from pathlib import Path

# Make `tools` and `rag` importable both when this module is imported by
# the app (backend on sys.path) and when run directly (backend/rag on
# sys.path).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools.file_tools import WORKSPACE_DIR, _resolve_safe  # noqa: E402
from rag.vector_store import add_documents, query_knowledge_base  # noqa: E402

SOP_FOLDER = WORKSPACE_DIR / "sop_documents"
SOP_FOLDER.mkdir(parents=True, exist_ok=True)


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks, preferring sentence boundaries.

    Walk the text sentence by sentence, accumulating until the next
    sentence would push past chunk_size. Then step BACK `overlap`
    characters (at a sentence boundary when possible) before starting the
    next chunk, so context never gets lost at a boundary.

    Args:
        text: The full document text.
        chunk_size: Target chunk length in characters.
        overlap: How much of the previous chunk to repeat.

    Returns:
        List of chunk strings. A short text returns as one chunk.
    """
    if not text or not text.strip():
        return []

    # Split into sentence-ish units: keep the punctuation attached and
    # treat newlines as boundaries too.
    sentences = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return [text.strip()]

    chunks = []
    current = []
    current_len = 0

    for sentence in sentences:
        # A single sentence longer than chunk_size becomes its own chunk.
        if len(sentence) > chunk_size and current:
            chunks.append(" ".join(current))
            current = []
            current_len = 0
        if len(sentence) > chunk_size:
            chunks.append(sentence)
            continue

        if current and current_len + len(sentence) + 1 > chunk_size:
            chunks.append(" ".join(current))
            # Walk back `overlap` chars for the next chunk, re-including
            # trailing sentences while under the overlap budget. Always
            # keep at least the LAST sentence, so a sentence longer than
            # the budget still overlaps instead of leaving a bare seam.
            kept = [current[-1]]
            kept_len = len(current[-1]) + 1
            for prev in reversed(current[:-1]):
                if kept_len + len(prev) + 1 > overlap:
                    break
                kept.insert(0, prev)
                kept_len += len(prev) + 1
            current = kept
            current_len = kept_len

        current.append(sentence)
        current_len += len(sentence) + 1

    if current:
        chunks.append(" ".join(current))

    return chunks


def _safe_source_id(source_name: str) -> str:
    """Turn a source name into a Chroma-friendly ID fragment."""
    slug = re.sub(r"[^A-Za-z0-9_]+", "_", source_name).strip("_").lower()
    return slug or "doc"


def ingest_file(file_path: str, source_name: str = None) -> dict:
    """Read a workspace text file, chunk it, and store it.

    Args:
        file_path: Path relative to backend/workspace/.
        source_name: Label stored in metadata; defaults to the file name.

    Returns:
        {"status": "success", "output": "Ingested N chunks from <name>",
         "chunk_count": N} or a clean error dict. Never raises.
    """
    safe_path = _resolve_safe(file_path)
    if safe_path is None:
        return {
            "status": "error",
            "output": f"Path rejected (must stay inside the workspace): {file_path!r}",
        }

    try:
        text = safe_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {"status": "error", "output": f"File not found: {file_path}"}
    except (OSError, UnicodeDecodeError) as exc:
        return {"status": "error", "output": f"Could not read {file_path}: {exc}"}

    source = source_name or safe_path.name
    chunks = chunk_text(text)
    if not chunks:
        return {"status": "error", "output": f"File is empty: {file_path}"}

    base_id = _safe_source_id(source)
    ids = [f"{base_id}_{index}" for index in range(len(chunks))]
    metadatas = [
        {"source": source, "chunk_index": index}
        for index in range(len(chunks))
    ]

    result = add_documents(chunks, metadatas, ids)
    if result["status"] != "success":
        return result

    return {
        "status": "success",
        "output": f"Ingested {len(chunks)} chunks from {source}",
        "chunk_count": len(chunks),
    }


def ingest_folder(folder_path: str = "sop_documents") -> dict:
    """Ingest every .txt file in a workspace subfolder.

    Args:
        folder_path: Subfolder of backend/workspace/ (created if missing).

    Returns:
        {"status": "success", "output": "Ingested X files, Y total chunks",
         "files_processed": [...]} or a clean error dict.
    """
    safe_folder = _resolve_safe(folder_path)
    if safe_folder is None:
        return {
            "status": "error",
            "output": f"Path rejected (must stay inside the workspace): {folder_path!r}",
        }

    safe_folder.mkdir(parents=True, exist_ok=True)
    txt_files = sorted(safe_folder.glob("*.txt"))

    if not txt_files:
        return {
            "status": "error",
            "output": f"No .txt files found in {folder_path}",
        }

    files_processed = []
    total_chunks = 0
    for txt_file in txt_files:
        result = ingest_file(str(txt_file.relative_to(WORKSPACE_DIR)))
        if result["status"] == "success":
            files_processed.append(txt_file.name)
            total_chunks += result.get("chunk_count", 0)
        else:
            print(f"[INGEST] WARNING: {txt_file.name}: {result['output']}")

    return {
        "status": "success",
        "output": f"Ingested {len(files_processed)} files, {total_chunks} total chunks",
        "files_processed": files_processed,
    }


if __name__ == "__main__":
    print(f"SOP folder: {SOP_FOLDER}\n")

    print("=== INGEST ===")
    summary = ingest_folder()
    print(f"  -> {summary}")
    print(f"  files: {summary.get('files_processed')}\n")

    print("=== QUERIES ===")
    test_queries = [
        "what is the valve inspection interval",
        "what are the safety shutdown steps",
        "how is corrosion treated after inspection",
    ]
    for query in test_queries:
        print(f"\nQuery: {query!r}")
        result = query_knowledge_base(query, n_results=2)
        if result["status"] != "success":
            print(f"  error: {result['output']}")
            continue
        for i, (text, source) in enumerate(
            zip(result["output"], result["sources"]), 1
        ):
            print(f"  [{i}] {source}: {text[:130]}")
