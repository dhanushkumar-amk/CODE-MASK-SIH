"""FastAPI application for the Sovereign AI Workbench backend."""

import json

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.ollama_client import OllamaError, call_model
from agent.agent_loop import run_agent, run_agent_stream
from config import DEFAULT_MODEL
from monitor.network_monitor import get_network_stats
from router.router import LOG_FILE, route_task
from tools.file_tools import _resolve_safe

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


@app.get("/network-status")
def network_status():
    """Current network counters for the live frontend panel.

    Single reading of cumulative system-wide bytes; the Next.js frontend
    polls this and diffs consecutive responses to display per-second
    activity.
    """
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
    """Run the full agent loop (plan -> tools -> answer) on a goal.

    run_agent() itself never raises (it returns partial results even on a
    model outage), so this try/except guards against unexpected failures
    in the loop's dependencies.
    """
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
    """Format a dict as a Server-Sent Events data frame.

    SSE framing is `data: <json>\n\n`; a comment keepalive (`: ping`) is
    interleaved so proxies/browsers don't close an idle connection while
    a model call is in flight.
    """
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.post("/agent/run/stream")
def agent_run_stream(body: AgentRunRequest):
    """Stream the agent loop as Server-Sent Events, one event per phase.

    The client receives events incrementally: plan_ready first, then
    step_start/step_complete pairs as each step runs, and a final done
    event with the full result dict. Strictly localhost traffic - the
    generator itself never makes external network calls.
    """
    if not body.goal or not body.goal.strip():
        raise HTTPException(
            status_code=400,
            detail="Missing or empty 'goal' field in request body",
        )

    def event_stream():
        try:
            for payload in run_agent_stream(body.goal.strip()):
                yield _sse_event(payload)
                # Keepalive between events: each step involves a model
                # call that can take many seconds, and an SSE client must
                # not see a fully idle connection.
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

    # Most recent first.
    return list(reversed(decisions))
