"use client";

import { useState } from "react";

import ExecutionTrace from "@/app/components/ExecutionTrace";
import TaskInput from "@/app/components/TaskInput";
import { runAgentStream, type AgentRunResult, type AgentStreamEvent } from "@/lib/api";

export default function Home() {
  // Built incrementally from /agent/run/stream events: plan_ready seeds
  // the plan rows, step_start marks a row running, step_complete fills in
  // its outcome, done finalizes the header.
  const [agentResult, setAgentResult] = useState<AgentRunResult | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleAgentEvent = (event: AgentStreamEvent) => {
    if (event.event === "run_started") {
      setAgentResult({
        goal: event.goal,
        plan: [],
        results: [],
        completed: false,
      });
      setIsStreaming(true);
    } else if (event.event === "plan_ready") {
      // plan_ready may arrive without a prior run_started (e.g. a stream
      // opened mid-run), so build a full result shape instead of assuming
      // state exists.
      setAgentResult((prev) => ({
        goal: event.goal,
        plan: event.plan,
        results: prev?.results ?? [],
        completed: false,
      }));
    } else if (event.event === "step_start") {
      setAgentResult((prev) =>
        prev ? { ...prev, results: [...prev.results, runningStep(event)] } : prev
      );
    } else if (event.event === "step_complete") {
      setAgentResult((prev) =>
        prev
          ? { ...prev, results: upsertStep(prev.results, event) }
          : prev
      );
    } else if (event.event === "done") {
      setAgentResult(event);
      setIsStreaming(false);
    } else if (event.event === "error") {
      setIsStreaming(false);
    }
  };

  const handleRunGoal = async (goal: string) => {
    setIsStreaming(true);
    try {
      await runAgentStream(goal, handleAgentEvent);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <>
      <TaskInput onAgentEvent={handleAgentEvent} />
      {agentResult && (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 pb-16">
          <ExecutionTrace result={agentResult} isStreaming={isStreaming} onRunGoal={handleRunGoal} />
        </div>
      )}
    </>
  );
}

/** Placeholder for a step that just started (model still thinking). */
function runningStep(event: Extract<AgentStreamEvent, { event: "step_start" }>) {
  return {
    step: event.step,
    status: "running" as const,
    action_type: null,
    output: "",
    tool_input: null,
    reasoning: null,
  };
}

/** Replace the running placeholder (same step_number) with its outcome. */
function upsertStep(
  results: AgentRunResult["results"],
  event: Extract<AgentStreamEvent, { event: "step_complete" }>
): AgentRunResult["results"] {
  const index = results.findIndex((step, i) => i + 1 === event.step_number);
  const { step_number: _n, event: _e, ...entry } = event;
  if (index >= 0) {
    const copy = [...results];
    copy[index] = entry;
    return copy;
  }
  return [...results, entry];
}
