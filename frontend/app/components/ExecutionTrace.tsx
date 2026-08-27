"use client";

import { useState } from "react";
import { Check, ChevronDown, Loader2, Minus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentRunResult, AgentStep } from "@/lib/api";

type StepStatus = AgentStep["status"] | "pending";

/**
 * Vertical timeline of agent steps: numbered nodes joined by a thin line,
 * each with a grayscale status badge and an expandable raw-detail section.
 *
 * Driven by live events from POST /agent/run/stream: plan_ready seeds the
 * plan rows (rendered as pending), step_start adds a running row, and
 * step_complete fills in its outcome. Each newly added row animates in
 * with a subtle fade/slide so the trace visibly grows in real time.
 */
export default function ExecutionTrace({
  result,
  isStreaming = false,
}: {
  result: AgentRunResult;
  isStreaming?: boolean;
}) {
  // The results array from the streaming state is the source of truth:
  // it holds running placeholders and completed entries in order. Plan
  // rows without a matching result yet render as pending.
  const steps: {
    number: number;
    planText: string;
    status: StepStatus;
    entry?: AgentStep;
  }[] = result.plan.map((planText, index) => {
    const entry = result.results[index];
    return {
      number: index + 1,
      planText,
      status: entry ? entry.status : "pending",
      entry,
    };
  });

  // Executed steps with no corresponding plan row (e.g. the final
  // synthesis turn) still get a row so nothing is hidden.
  result.results.forEach((entry, index) => {
    if (index >= steps.length) {
      steps.push({
        number: index + 1,
        planText: entry.step,
        status: entry.status,
        entry,
      });
    }
  });

  const completedSteps = result.results.filter((r) => r.status === "done").length;
  const totalSteps = Math.max(steps.length, result.plan.length);

  return (
    <section className="w-full">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Execution Trace
        </h2>
        <span className="text-xs text-muted-foreground">
          {completedSteps}/{totalSteps} steps done
          {isStreaming
            ? " · running"
            : result.completed
              ? " · completed"
              : " · incomplete"}
        </span>
      </div>

      <ol className="relative ml-4 list-none border-l border-border">
        {steps.map((step, index) => (
          <StepRow
            key={index}
            number={step.number}
            planText={step.planText}
            status={step.status}
            entry={step.entry}
            isLast={index === steps.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

function StepRow({
  number,
  planText,
  status,
  entry,
  isLast,
}: {
  number: number;
  planText: string;
  status: StepStatus;
  entry?: AgentRunResult["results"][number];
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(entry);

  return (
    <li
      className={cn(
        // Newly mounted rows fade/slide in; existing rows keep their key
        // (index), so status updates never re-trigger the animation.
        "relative flex gap-4 pl-6 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isLast ? "pb-0" : "pb-6"
      )}
    >
      {/* Node marker, centered on the vertical line. */}
      <span
        className={cn(
          "absolute top-2 -left-[7.5px] flex size-3.5 items-center justify-center rounded-full border",
          status === "done"
            ? "border-foreground bg-foreground text-background"
            : status === "failed"
              ? "border-foreground bg-background text-foreground"
              : "border-border bg-background text-muted-foreground"
        )}
        aria-hidden="true"
      >
        {status === "done" ? (
          <Check className="size-2" strokeWidth={3} />
        ) : status === "failed" ? (
          <X className="size-2" strokeWidth={3} />
        ) : status === "running" ? (
          <Loader2 className="size-2 animate-spin" />
        ) : (
          <Minus className="size-2" strokeWidth={3} />
        )}
      </span>

      <div className="flex w-full flex-col gap-1.5 rounded-lg border border-border bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Step {number}
          </span>
          <StatusBadge status={status} />
          {entry?.action_type && <ActionLabel entry={entry} />}
        </div>

        <p className="text-sm text-foreground">{planText}</p>

        {entry?.reasoning && (
          <p className="text-xs italic text-muted-foreground">
            {entry.reasoning}
          </p>
        )}

        {hasDetail && (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={open}
          >
            <ChevronDown
              className={cn("size-3 transition-transform", open && "rotate-180")}
            />
            {open ? "Hide detail" : "Show detail"}
          </button>
        )}

        {open && entry && (
          <div className="mt-1 flex flex-col gap-2 rounded-md bg-muted/50 p-3 font-mono text-xs">
            {entry.tool_input != null && (
              <div>
                <p className="mb-1 font-sans font-medium text-foreground">
                  Raw tool input
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words text-muted-foreground">
                  {JSON.stringify(entry.tool_input, null, 2)}
                </pre>
              </div>
            )}
            <div>
              <p className="mb-1 font-sans font-medium text-foreground">
                {entry.action_type === "final_answer"
                  ? "Final answer"
                  : "Raw tool output"}
              </p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-muted-foreground">
                {entry.output || "(empty)"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: StepStatus }) {
  switch (status) {
    case "done":
      return (
        <Badge className="border-transparent bg-foreground text-primary-foreground">
          done
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="outline"
          className="border-foreground bg-background text-foreground"
        >
          <X className="size-3" strokeWidth={3} />
          failed
        </Badge>
      );
    case "running":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="size-3 animate-spin" />
          running
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          pending
        </Badge>
      );
  }
}

function ActionLabel({ entry }: { entry: AgentRunResult["results"][number] }) {
  if (entry.action_type === "final_answer") {
    return <span className="text-xs text-muted-foreground">Final Answer</span>;
  }
  if (entry.action_type === "tool_call" && entry.tool_name) {
    return (
      <span className="text-xs text-muted-foreground">
        Tool Call: {entry.tool_name}
      </span>
    );
  }
  return null;
}
