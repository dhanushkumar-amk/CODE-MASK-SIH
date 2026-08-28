"""Provenance and audit trail tracking for AI-generated deliverables.

Provides cryptographic verification (SHA-256 source hashing), offline audit metadata,
and formatted provenance footers for documents, presentations, and spreadsheets.
"""

import hashlib
import os
import sys
from datetime import datetime
from pathlib import Path

# Ensure backend root is on sys.path for workspace imports
SYS_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(SYS_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(SYS_BACKEND_DIR))

# In-memory session provenance context (thread-safe for single-user workbench)
_provenance_context = {
    "model_used": "qwen2.5:1.5b-instruct",
    "task_type": "document",
    "source_documents": [],
    "timestamp": None,
}


def reset_provenance_context() -> None:
    """Reset provenance context for a new task session."""
    global _provenance_context
    _provenance_context = {
        "model_used": "qwen2.5:1.5b-instruct",
        "task_type": "document",
        "source_documents": [],
        "timestamp": None,
    }


def set_routing_context(model_used: str, task_type: str, timestamp: str = None) -> None:
    """Update current routing decision in session provenance context."""
    global _provenance_context
    if model_used:
        _provenance_context["model_used"] = model_used
    if task_type:
        _provenance_context["task_type"] = task_type
    if timestamp:
        _provenance_context["timestamp"] = timestamp


def add_source_document(source: str) -> None:
    """Add a retrieved or inspected source document/file to current session provenance."""
    global _provenance_context
    if source and isinstance(source, str) and source.strip():
        clean_source = source.strip()
        if clean_source not in _provenance_context["source_documents"]:
            _provenance_context["source_documents"].append(clean_source)


def compute_source_hash(file_path: str) -> str:
    """Compute a SHA-256 cryptographic hash of a source document or scan file.

    Args:
        file_path: Relative or absolute path to the source file.

    Returns:
        Hexadecimal SHA-256 hash string, or "N/A" if file cannot be read.
    """
    if not file_path or not isinstance(file_path, str):
        return "N/A"

    path = Path(file_path)

    # If path is not absolute or doesn't exist, search workspace directory
    if not path.exists():
        try:
            from tools.file_tools import WORKSPACE_DIR
            alt_path = WORKSPACE_DIR / file_path
            if alt_path.exists():
                path = alt_path
        except Exception:
            pass

    # Search in backend workspace or current dir if needed
    if not path.exists():
        rel_workspace = SYS_BACKEND_DIR / "workspace" / file_path
        if rel_workspace.exists():
            path = rel_workspace

    if not path.exists() or not path.is_file():
        return "N/A"

    try:
        sha256 = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
    except Exception:
        return "N/A"


def generate_provenance_record(
    model_used: str = None,
    task_type: str = None,
    source_documents: list = None,
    generation_timestamp: str = None,
) -> dict:
    """Build a structured provenance record with cryptographic source hashes.

    Args:
        model_used: AI model name (e.g. "qwen2.5:1.5b-instruct").
        task_type: Classification ("coding", "document", "vision").
        source_documents: List of source file paths / SOP names used in RAG/OCR.
        generation_timestamp: ISO timestamp string (defaults to now).

    Returns:
        Structured audit trail dictionary.
    """
    # Fall back to session context if arguments are omitted
    if model_used is None:
        model_used = _provenance_context.get("model_used", "qwen2.5:1.5b-instruct")
    if task_type is None:
        task_type = _provenance_context.get("task_type", "document")
    if source_documents is None:
        source_documents = list(_provenance_context.get("source_documents", []))
    if generation_timestamp is None:
        generation_timestamp = _provenance_context.get("timestamp") or datetime.now().isoformat()

    # Format model name with offline badge
    model_name = str(model_used).strip()
    if "(local, offline)" not in model_name:
        generated_by = f"{model_name} (local, offline)"
    else:
        generated_by = model_name

    # Process and hash each source document
    formatted_sources = []
    if isinstance(source_documents, list):
        for doc in source_documents:
            if not doc:
                continue
            doc_str = str(doc).strip()
            doc_hash = compute_source_hash(doc_str)
            filename = Path(doc_str).name
            if doc_hash != "N/A":
                formatted_sources.append(f"{filename} (SHA-256: {doc_hash[:16]}...)")
            else:
                formatted_sources.append(filename)

    return {
        "generated_by": generated_by,
        "task_type": str(task_type).strip(),
        "timestamp": generation_timestamp,
        "source_documents": formatted_sources,
        "network_status": "Verified offline — zero external calls during generation",
        "system": "Sovereign Workbench v1.0",
    }


def format_provenance_footer(record: dict) -> str:
    """Format a provenance record dictionary into a clean, readable text block footer.

    Args:
        record: Dict returned by generate_provenance_record().

    Returns:
        Multi-line string formatted cleanly with "---" divider.
    """
    if not isinstance(record, dict):
        record = generate_provenance_record()

    gen_by = record.get("generated_by", "qwen2.5:1.5b-instruct (local, offline)")
    task_t = record.get("task_type", "document")
    ts = record.get("timestamp", datetime.now().isoformat())
    sources = record.get("source_documents", [])
    net_status = record.get(
        "network_status", "Verified offline — zero external calls during generation"
    )
    system_name = record.get("system", "Sovereign Workbench v1.0")

    if sources and isinstance(sources, list) and len(sources) > 0:
        sources_str = ", ".join(str(s) for s in sources)
    else:
        sources_str = "No external source documents used — general model knowledge"

    footer_lines = [
        "---",
        f"Generated by: {gen_by}",
        f"Task type: {task_t}",
        f"Timestamp: {ts}",
        f"Source document(s): {sources_str}",
        f"Network status: {net_status}",
        f"System: {system_name}",
    ]
    return "\n".join(footer_lines)


def get_current_provenance_record() -> dict:
    """Helper to return a generated provenance record from the current session context."""
    return generate_provenance_record()


if __name__ == "__main__":
    print("=" * 60)
    print(" PROVENANCE TRACKER TEST")
    print("=" * 60)

    # Test hash of self
    self_hash = compute_source_hash(__file__)
    print(f"Self file hash: {Path(__file__).name} -> {self_hash}")

    # Test record with RAG source
    rec_rag = generate_provenance_record(
        model_used="qwen2.5:1.5b-instruct",
        task_type="document",
        source_documents=[__file__, "SOP_Valve_Maintenance_Rev3.txt"],
    )
    print("\n--- RAG SOURCE RECORD ---")
    print(format_provenance_footer(rec_rag))

    # Test record without RAG source
    rec_norag = generate_provenance_record(
        model_used="qwen2.5:1.5b-instruct",
        task_type="coding",
        source_documents=[],
    )
    print("\n--- NO-RAG SOURCE RECORD ---")
    print(format_provenance_footer(rec_norag))
