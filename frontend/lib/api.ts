/** Typed client for the Sovereign AI Workbench backend (localhost:8000). */

const BACKEND_URL = "http://localhost:8000";

/** Shape returned by POST /route. */
export interface RouteResult {
  task: string;
  task_type: string;
  model: string;
  timestamp: string;
}

/** One step of the agent loop trace (POST /agent/run result entry). */
export interface AgentStep {
  step: string;
  /** "done" | "failed" from the backend; "running" is a UI-only state
      applied while the step's model call is in flight. */
  status: "done" | "failed" | "running";
  /** "tool_call" | "final_answer" | null. */
  action_type: string | null;
  output: string;
  /** Set when action_type === "tool_call". */
  tool_name?: string;
  /** Raw kwargs the model passed to the tool (shown in the trace). */
  tool_input?: Record<string, unknown> | null;
  /** The model's stated reason for this step. */
  reasoning?: string | null;
}

/** Shape returned by POST /agent/run. */
export interface AgentRunResult {
  goal: string;
  plan: string[];
  results: AgentStep[];
  completed: boolean;
}

/** Raw entry as sent by the backend (uses "action", not "action_type"). */
interface WireAgentStep extends Omit<AgentStep, "action_type"> {
  action: string | null;
}

/** Normalize the wire format to the UI type: "action" -> "action_type". */
function toUiStep(wire: WireAgentStep): AgentStep {
  const { action, ...rest } = wire;
  return { ...rest, action_type: action };
}

/** Error thrown for any failed backend call, with a UI-friendly message. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Cannot reach the backend at localhost:8000. Is it running?"
    );
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const parsed = await response.json();
      if (parsed && typeof parsed.detail === "string") {
        detail = parsed.detail;
      }
    } catch {
      // Non-JSON error body; keep the status-based message.
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<T>;
}

/** Upload a file (scan/document) to the backend workspace. */
export async function uploadFile(file: File): Promise<{ filename: string; message: string }> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/upload`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the backend at localhost:8000. Is it running?"
    );
  }

  if (!response.ok) {
    let detail = `Upload failed with status ${response.status}`;
    try {
      const parsed = await response.json();
      if (parsed && typeof parsed.detail === "string") {
        detail = parsed.detail;
      }
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
}

/** Send a task to the router; returns the routing decision. */
export function routeTask(task: string): Promise<RouteResult> {
  return postJson<RouteResult>("/route", { task });
}

/** Run the full agent loop on a goal; returns the complete trace. */
export async function runAgent(goal: string): Promise<AgentRunResult> {
  const raw = await postJson<{
    goal: string;
    plan: string[];
    results: WireAgentStep[];
    completed: boolean;
  }>("/agent/run", { goal });

  // Normalize the wire format to the UI type: "action" -> "action_type".
  return {
    goal: raw.goal,
    plan: raw.plan,
    completed: raw.completed,
    results: raw.results.map(toUiStep),
  };
}

/** Event frames emitted by POST /agent/run/stream (SSE over fetch). */
export type AgentStreamEvent =
  | { event: "run_started"; goal: string }
  | {
      event: "plan_ready";
      goal: string;
      plan: string[];
    }
  | {
      event: "step_start";
      step_number: number;
      step: string;
    }
  | ({
      event: "step_complete";
      step_number: number;
    } & AgentStep)
  | ({
      event: "done";
    } & AgentRunResult)
  | { event: "error"; message: string };

/** Raw wire frames before normalization (step/done carry "action"). */
type WireStreamEvent =
  | { event: "run_started"; goal: string }
  | { event: "plan_ready"; goal: string; plan: string[] }
  | { event: "step_start"; step_number: number; step: string }
  | ({ event: "step_complete"; step_number: number } & WireAgentStep)
  | {
      event: "done";
      goal: string;
      plan: string[];
      results: WireAgentStep[];
      completed: boolean;
    }
  | { event: "error"; message: string };

/**
 * POST the goal to /agent/run/stream and invoke onEvent for every SSE
 * event as it arrives (plan_ready, step_start, step_complete, done).
 *
 * EventSource only supports GET, so this uses fetch + a ReadableStream
 * reader and parses the `data: {...}\n\n` frames manually. Throws
 * ApiError if the backend is unreachable or the stream errors mid-run.
 */
export async function runAgentStream(
  goal: string,
  onEvent: (event: AgentStreamEvent) => void
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/agent/run/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ goal }),
    });
  } catch {
    throw new ApiError(
      "Cannot reach the backend at localhost:8000. Is it running?"
    );
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const parsed = await response.json();
      if (parsed && typeof parsed.detail === "string") {
        detail = parsed.detail;
      }
    } catch {
      // Non-JSON error body; keep the status-based message.
    }
    throw new ApiError(detail, response.status);
  }

  if (!response.body) {
    throw new ApiError("Streaming response has no body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Normalize wire events to UI events at the API boundary: step_complete
  // and done results carry "action", the UI type uses "action_type".
  const emit = (event: WireStreamEvent) => {
    if (event.event === "step_complete") {
      const { step_number, event: _e, ...wire } = event;
      onEvent({ event: "step_complete", step_number, ...toUiStep(wire) });
    } else if (event.event === "done") {
      const { event: _e, ...wireResult } = event;
      onEvent({
        event: "done",
        goal: wireResult.goal,
        plan: wireResult.plan,
        completed: wireResult.completed,
        results: wireResult.results.map(toUiStep),
      });
    } else {
      onEvent(event);
    }
  };

  // SSE frames are separated by blank lines; keep the un-terminated tail
  // in buffer until the next chunk completes it.
  const processBuffer = () => {
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue; // skip comments/keepalive
        try {
          const parsed = JSON.parse(trimmed.slice(5).trim());
          if (
            parsed &&
            typeof parsed === "object" &&
            "event" in parsed
          ) {
            emit(parsed as WireStreamEvent);
          }
        } catch {
          // Ignore malformed frames; the stream continues.
        }
      }
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      processBuffer();
    }
    buffer += decoder.decode(); // flush final bytes
    processBuffer();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("Agent stream was aborted.");
    }
    throw new ApiError("Connection to the agent stream was lost.");
  }
}

/** Get full URL to download a generated file from the backend workspace. */
export function getDownloadUrl(filename: string): string {
  return `${BACKEND_URL}/download/${encodeURIComponent(filename)}`;
}
