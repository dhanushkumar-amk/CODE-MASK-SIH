"use client";

import { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Loader2, Wrench, Sparkles } from "lucide-react";
import type { AgentRunResult, AgentStep, RouteResult } from "@/lib/api";

export default function ExecutionTrace({
  result,
  isStreaming = false,
  route,
}: {
  result: AgentRunResult;
  isStreaming?: boolean;
  route?: RouteResult | null;
}) {
  const steps = result.results ?? [];
  const [isOpen, setIsOpen] = useState(false);

  if (steps.length === 0 && !isStreaming) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex flex-col gap-2">
        {/* Subtle Reasoning Collapsible Trigger Header */}
        <CollapsibleTrigger className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors py-1 px-1.5 rounded-md hover:bg-slate-100/80 cursor-pointer w-fit">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span>
            {isStreaming
              ? "Reasoning and executing steps..."
              : `Thought for ${steps.length} ${steps.length === 1 ? "step" : "steps"}`}
          </span>
          {route?.task_type && (
            <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200 py-0 px-1.5 font-mono">
              {route.task_type}
            </Badge>
          )}
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          )}
        </CollapsibleTrigger>

        {/* Collapsible Content */}
        <CollapsibleContent className="pt-2">
          <div className="relative flex flex-col gap-2.5 pl-4 border-l-2 border-slate-200 my-1 ml-1.5">
            {steps.map((step, idx) => (
              <StepRow key={idx} step={step} stepNumber={idx + 1} />
            ))}

            {isStreaming && (
              <div className="p-3 rounded-xl border border-blue-200/80 bg-blue-50/70 text-blue-900 text-xs flex items-center gap-3 font-medium shadow-2xs my-1 animate-pulse">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" />
                </div>
                <span>
                  {steps.length === 0
                    ? "Agent is planning task steps & reasoning..."
                    : `Agent is executing step ${steps.length + 1}...`}
                </span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function StepRow({ step, stepNumber }: { step: AgentStep; stepNumber: number }) {
  const [isOpen, setIsOpen] = useState(false);

  const renderStatusIcon = () => {
    if (step.status === "done") {
      return <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 bg-white rounded-full" />;
    } else if (step.status === "failed") {
      return <AlertCircle className="h-3.5 w-3.5 text-red-600 bg-white rounded-full" />;
    } else {
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 bg-white rounded-full" />;
    }
  };

  const hasDetails = step.tool_input || step.output || step.reasoning;

  return (
    <div className="relative w-full border border-slate-200/80 bg-white p-3 rounded-xl shadow-2xs hover:border-slate-300 transition-all text-xs">
      <span className="absolute -left-[23px] top-3.5 flex h-4 w-4 items-center justify-center rounded-full bg-white">
        {renderStatusIcon()}
      </span>

      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold font-mono text-slate-500 text-[11px]">
                Step {stepNumber}
              </span>

              {step.tool_name && (
                <Badge variant="secondary" className="text-[10px] py-0 px-2 border-slate-200 bg-slate-50 text-slate-700 font-mono font-medium flex items-center gap-1 rounded-md">
                  <Wrench className="h-2.5 w-2.5 text-blue-600" />
                  {step.tool_name}
                </Badge>
              )}
            </div>

            {hasDetails && (
              <CollapsibleTrigger className="p-1 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </CollapsibleTrigger>
            )}
          </div>

          <div className="text-xs text-slate-800 leading-relaxed font-medium">
            {step.step}
          </div>

          {step.reasoning && (
            <div className="text-[11px] text-slate-500 italic">
              Reasoning: {step.reasoning}
            </div>
          )}

          <CollapsibleContent className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex flex-col gap-2 font-mono text-[11px] bg-slate-100/90 p-3 rounded-lg text-slate-800 border border-slate-200">
              {step.tool_input && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                    Input Arguments:
                  </span>
                  <pre className="overflow-x-auto bg-white p-2.5 rounded border border-slate-200 text-slate-900 leading-tight">
                    <code>{JSON.stringify(step.tool_input, null, 2)}</code>
                  </pre>
                </div>
              )}

              {step.output && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                    Execution Output:
                  </span>
                  <pre className="overflow-x-auto bg-white p-2.5 rounded border border-slate-200 text-slate-900 leading-tight whitespace-pre-wrap max-h-48">
                    <code>{step.output}</code>
                  </pre>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}



