"""FastAPI application for the Sovereign AI Workbench backend."""

import json

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from agent.ollama_client import OllamaError, call_model
from agent.agent_loop import run_agent, run_agent_stream
from config import DEFAULT_MODEL
from monitor.network_monitor import get_network_stats
from router.router import LOG_FILE, route_task
from tools.file_tools import WORKSPACE_DIR, _resolve_safe

app = FastAPI(title="Sovereign AI Workbench API")

# Allow the Next.js frontend (dev server) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str | None = None


class GenerateResponse(BaseModel):
    response: str
    model: str


class RouteRequest(BaseModel):
    task: str | None = None


class AgentRunRequest(BaseModel):
    goal: str | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/files")
def list_workspace_files():
    """List all generated documents, presentations, spreadsheets, and files in backend/workspace/."""
    files = []
    if WORKSPACE_DIR.exists():
        for p in WORKSPACE_DIR.iterdir():
            if p.is_file() and not p.name.startswith("."):
                files.append({
                    "filename": p.name,
                    "size_bytes": p.stat().st_size,
                    "extension": p.suffix.lower(),
                })
    return {"files": files}


@app.get("/download/{filename}")
def download_file(filename: str):
    """Download or view a generated document (.docx, .pptx, .xlsx, .csv, .txt, .pdf) from backend/workspace/."""
    safe_path = _resolve_safe(filename)
    if safe_path is None or not safe_path.exists() or not safe_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"File not found: {filename}",
        )

    ext = safe_path.suffix.lower()
    media_types = {
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".csv": "text/csv",
        ".pdf": "application/pdf",
        ".txt": "text/plain; charset=utf-8",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    content_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=safe_path,
        filename=safe_path.name,
        media_type=content_type,
    )


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a scan or document file directly into the backend workspace/ directory."""
    filename = file.filename or "uploaded_file"
    safe_path = _resolve_safe(filename)
    if safe_path is None:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file path: {filename}",
        )

    try:
        content = await file.read()
        safe_path.parent.mkdir(parents=True, exist_ok=True)
        safe_path.write_bytes(content)
        return {
            "status": "success",
            "filename": safe_path.name,
            "message": f"File '{safe_path.name}' uploaded successfully",
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save uploaded file: {exc}",
        )


@app.get("/network-status")
def network_status():
    return get_network_stats()


@app.post("/generate", response_model=GenerateResponse)
def generate(body: GenerateRequest):
    if not body.prompt or not body.prompt.strip():
        raise HTTPException(
            status_code=400,
            detail="Missing or empty 'prompt' field in request body",
        )

    try:
        text = call_model(body.prompt.strip())
    except OllamaError:
        raise HTTPException(
            status_code=503,
            detail="Ollama service unavailable, please ensure it is running locally",
        )

    return GenerateResponse(response=text, model=DEFAULT_MODEL)


@app.post("/route")
def route(body: RouteRequest):
    if not body.task or not body.task.strip():
        raise HTTPException(
            status_code=400,
            detail="Missing or empty 'task' field in request body",
        )

    try:
        return route_task(body.task.strip())
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Routing failed due to an internal error",
        )


@app.post("/agent/run")
def agent_run(body: AgentRunRequest):
    if not body.goal or not body.goal.strip():
        raise HTTPException(
            status_code=400,
            detail="Missing or empty 'goal' field in request body",
        )

    try:
        return run_agent(body.goal.strip())
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Agent run failed: {exc}",
        )


def _sse_event(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.post("/agent/run/stream")
def agent_run_stream(body: AgentRunRequest):
    if not body.goal or not body.goal.strip():
        raise HTTPException(
            status_code=400,
            detail="Missing or empty 'goal' field in request body",
        )

    def event_stream():
        try:
            for payload in run_agent_stream(body.goal.strip()):
                yield _sse_event(payload)
                yield ": ping\n\n"
        except Exception as exc:
            yield _sse_event(
                {"event": "error", "message": f"Agent run failed: {exc}"}
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/routing-log")
def routing_log():
    if not LOG_FILE.exists():
        return []

    decisions = []
    with open(LOG_FILE, "r", encoding="utf-8") as log_file:
        for line in log_file:
            line = line.strip()
            if line:
                decisions.append(json.loads(line))

    return list(reversed(decisions))
