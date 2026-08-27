"""FastAPI application for the Sovereign AI Workbench backend."""

import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent.ollama_client import OllamaError, call_model
from agent.agent_loop import run_agent
from config import DEFAULT_MODEL
from monitor.network_monitor import get_network_stats
from router.router import LOG_FILE, route_task

app = FastAPI(title="Sovereign AI Workbench API")

# Allow the Next.js frontend (dev server) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
