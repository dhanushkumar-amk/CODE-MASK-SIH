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
  status: "done" | "failed";
  action: string | null;
  output: string;
  tool_name?: string;
}

/** Shape returned by POST /agent/run. */
export interface AgentRunResult {
  goal: string;
  plan: string[];
  results: AgentStep[];
  completed: boolean;
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

/** Send a task to the router; returns the routing decision. */
export function routeTask(task: string): Promise<RouteResult> {
  return postJson<RouteResult>("/route", { task });
}

/** Run the full agent loop on a goal; returns the complete trace. */
export function runAgent(goal: string): Promise<AgentRunResult> {
  return postJson<AgentRunResult>("/agent/run", { goal });
}
