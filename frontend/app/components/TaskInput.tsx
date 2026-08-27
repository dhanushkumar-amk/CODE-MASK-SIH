"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ApiError, routeTask, runAgent, type AgentRunResult, type RouteResult } from "@/lib/api";

export default function TaskInput() {
  const [taskText, setTaskText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [agentResult, setAgentResult] = useState<AgentRunResult | null>(null);

  // A task can be described in text, or carried in a scan (image/pdf).
  const canRun =
    (taskText.trim().length > 0 || fileName !== null) && !submitting;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFileName(file ? file.name : null);
  };

  const handleRunTask = async () => {
    if (!canRun) {
      return;
    }

    setError(null);
    setRouteResult(null);
    setAgentResult(null);
    setSubmitting(true);

    try {
      // File uploads are wired to the OCR pipeline in a later phase; for
      // now the text path (or a filename-only note) goes through routing
      // and the agent loop.
      if (fileName !== null) {
        console.log(
          "File upload handling (OCR pipeline) will be wired in a later phase:",
          fileName
        );
      }

      const goal = taskText.trim();
      if (!goal) {
        setError("Enter a task description to run.");
        return;
      }

      const routing = await routeTask(goal);
      setRouteResult(routing);
      console.log("Routing decision:", routing);

      const agent = await runAgent(goal);
      setAgentResult(agent);
      console.log("Agent result:", agent);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unexpected error while running the task.";
      setError(message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Sovereign AI Workbench
        </h1>
        <p className="text-lg text-muted-foreground">
          Runs entirely offline — nothing leaves this machine
        </p>
      </div>

      <div className="mt-12 flex w-full flex-col gap-4">
        <label
          htmlFor="task-description"
          className="text-sm font-medium text-foreground"
        >
          Task description
        </label>
        <Textarea
          id="task-description"
          placeholder="Describe the task — e.g. 'Read this scanned report and draft an approval note'"
          value={taskText}
          onChange={(event) => setTaskText(event.target.value)}
          rows={5}
          className="resize-none bg-white"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">
            Or attach a scan
          </span>
          <label
            htmlFor="file-upload"
            className={cn(
              "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-white px-6 py-8 text-center transition-colors hover:bg-muted focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
            )}
          >
            <input
              id="file-upload"
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="sr-only"
            />
            <span className="text-sm text-foreground">
              {fileName ?? "Drop a scan here, or click to browse"}
            </span>
            <span className="text-xs text-muted-foreground">
              {fileName
                ? "File selected"
                : "PNG, JPG, or PDF — stays on this machine"}
            </span>
          </label>
        </div>

        <Button
          type="button"
          onClick={handleRunTask}
          disabled={!canRun}
          size="lg"
          className="mt-2 w-full"
        >
          {submitting ? "Running…" : "Run Task"}
        </Button>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {(routeResult || agentResult) && (
          <div className="mt-2 flex flex-col gap-3 rounded-lg border border-border bg-white p-4">
            {routeResult && (
              <div>
                <p className="text-sm font-medium text-foreground">
                  Routing decision
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  task_type: {routeResult.task_type} · model:{" "}
                  {routeResult.model}
                </p>
              </div>
            )}
            {agentResult && (
              <div>
                <p className="text-sm font-medium text-foreground">
                  Agent result ({agentResult.completed ? "completed" : "incomplete"})
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {agentResult.results
                    .map((step) => step.output)
                    .filter(Boolean)
                    .join("\n") || "(no output)"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
