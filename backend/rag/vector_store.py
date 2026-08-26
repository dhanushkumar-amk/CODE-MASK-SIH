"""Local knowledge base (RAG) on ChromaDB, persistent and fully offline.

ChromaDB's default embedding function uses all-MiniLM-L6-v2 via ONNX
runtime - no GPU, no cloud API. The model is downloaded ONCE into
~/.cache/chroma/onnx_models/ and then runs fully offline forever. The
store itself persists in backend/rag/chroma_data/ so the knowledge base
survives between runs.

Sovereignty note: after the one-time model download, no network is ever
touched - embedding and querying are pure local compute.
"""

import sys
from pathlib import Path

# Make `config` importable both when this module is imported by the app
# (backend on sys.path) and when run directly (backend/rag on sys.path).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import chromadb
except ImportError:
    chromadb = None

# Persistent store location: backend/rag/chroma_data/ (auto-created).
CHROMA_DATA_DIR = Path(__file__).resolve().parent / "chroma_data"
CHROMA_DATA_DIR.mkdir(parents=True, exist_ok=True)

COLLECTION_NAME = "org_knowledge_base"

# Where ChromaDB caches the local embedding model (first-use download).
MODEL_CACHE_DIR = Path.home() / ".cache" / "chroma" / "onnx_models"

# Lazy singleton client - created on first use, reused afterwards.
_client = None


def _get_client():
    """Return the persistent ChromaDB client (created once)."""
    global _client
    if chromadb is None:
        raise RuntimeError(
            "chromadb is not installed. Run: pip install chromadb "
            "onnxruntime tokenizers"
        )
    if _client is None:
        _client = chromadb.PersistentClient(path=str(CHROMA_DATA_DIR))
    return _client


def get_collection():
    """Return (creating if needed) the 'org_knowledge_base' collection."""
    return _get_client().get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def add_documents(chunks: list, metadatas: list, ids: list) -> dict:
    """Add text chunks with metadata and IDs to the knowledge base.

    Args:
        chunks: List of text chunk strings.
        metadatas: Matching list of dicts, e.g. {"source": "SOP_X.txt"}.
        ids: Matching list of unique string IDs.

    Returns:
        {"status": "success", "output": "Added N chunks to knowledge base"}
        or {"status": "error", "output": "<clear message>"}. Never raises.
    """
    if not isinstance(chunks, list) or not chunks:
        return {"status": "error", "output": "chunks must be a non-empty list."}
    if len(chunks) != len(metadatas) or len(chunks) != len(ids):
        return {
            "status": "error",
            "output": (
                f"Length mismatch: chunks={len(chunks)}, "
                f"metadatas={len(metadatas)}, ids={len(ids)} - all three "
                "must be the same length."
            ),
        }

    try:
        collection = get_collection()
        collection.add(
            documents=chunks,
            metadatas=metadatas,
            ids=ids,
        )
    except Exception as exc:  # noqa: BLE001 - report cleanly, never crash.
        return {"status": "error", "output": f"Could not add documents: {exc}"}

    return {
        "status": "success",
        "output": f"Added {len(chunks)} chunks to knowledge base",
    }


def query_knowledge_base(query: str, n_results: int = 3) -> dict:
    """Return the most relevant chunks for a query.

    Args:
        query: The search text.
        n_results: Number of top matches to return.

    Returns:
        {"status": "success", "output": [matched texts],
         "sources": [source metadata strings]} or a clean error dict.
    """
    if not isinstance(query, str) or not query.strip():
        return {"status": "error", "output": "Query must be a non-empty string."}

    try:
        collection = get_collection()
        result = collection.query(
            query_texts=[query],
            n_results=n_results,
        )
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "output": f"Query failed: {exc}"}

    texts = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    sources = [
        (meta or {}).get("source", "unknown") for meta in metadatas
    ]

    return {"status": "success", "output": texts, "sources": sources}


if __name__ == "__main__":
    print(f"Chroma data dir: {CHROMA_DATA_DIR}")
    print(f"Model cache dir: {MODEL_CACHE_DIR}")
    print(f"Model cached (offline-ready): {MODEL_CACHE_DIR.exists()}\n")

    # Sample refinery SOP chunks.
    SAMPLE_CHUNKS = [
        (
            "SOP_VALVE_MAINTENANCE",
            "All manual valves shall be inspected and lubricated every 90 "
            "days. Actuated valves require a functional stroke test every "
            "30 days. Inspection records must be logged in the maintenance "
            "register.",
        ),
        (
            "SOP_CORROSION_INSPECTION",
            "Piping corrosion inspections are performed every 6 months on "
            "high-risk lines and every 12 months on standard lines. Minor "
            "surface corrosion should be cleaned, coated, and scheduled "
            "for re-inspection within 30 days.",
        ),
        (
            "SOP_SAFETY_SHUTDOWN",
            "In the event of a gas leak or fire, initiate the emergency "
            "shutdown sequence: isolate the affected section, close the "
            "feed valves, and notify the shift supervisor before any "
            "restart attempt.",
        ),
        (
            "SOP_PUMP_MAINTENANCE",
            "Centrifugal pumps must have bearing vibration measured "
            "monthly. Seal replacement is scheduled annually or after "
            "3000 operating hours, whichever comes first.",
        ),
    ]

    chunks = [text for _, text in SAMPLE_CHUNKS]
    metadatas = [{"source": name} for name, _ in SAMPLE_CHUNKS]
    ids = [name.lower() for name, _ in SAMPLE_CHUNKS]

    print(f"Adding {len(chunks)} sample SOP chunks...")
    add_result = add_documents(chunks, metadatas, ids)
    print(f"  -> {add_result}\n")

    QUERY = "how often should valves be inspected"
    print(f"Query: {QUERY!r}")
    query_result = query_knowledge_base(QUERY, n_results=2)
    print(f"  status: {query_result['status']}")
    if query_result["status"] == "success":
        for i, (text, source) in enumerate(
            zip(query_result["output"], query_result["sources"]), 1
        ):
            print(f"  [{i}] {source}: {text[:120]}")
    else:
        print(f"  error: {query_result['output']}")
