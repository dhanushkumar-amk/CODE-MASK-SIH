"use client";

import { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AgentRunResult, AgentStep } from "@/lib/api";

export default function ExecutionTrace({
  result,
  isStreaming = false,
}: {
  result: AgentRunResult;
  isStreaming?: boolean;
}) {
  const steps = result.results ?? [];

  return (
    <div className="w-full flex flex-col gap-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <span className="font-extrabold tracking-wider text-slate-900 uppercase text-xs flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-xs shadow-blue-500/50" />
          EXECUTION TRACE <span className="text-blue-600">//</span> STEP-BY-STEP AGENT LOOP
        </span>
        <Badge
          variant="outline"
          className="text-[10px] border-blue-200 font-mono text-blue-700 bg-blue-50/80 font-bold px-3 py-0.5 rounded-full"
        >
          {isStreaming ? "[STREAMING...]" : result.completed ? "[COMPLETED]" : "[IN PROGRESS]"}
        </Badge>
      </div>

      <ScrollArea className="w-full max-h-[520px] pr-3">
        <div className="relative flex flex-col gap-4 pl-5 border-l-2 border-blue-200/80 my-2 ml-2">
          {steps.map((step, idx) => (
            <StepRow key={idx} step={step} stepNumber={idx + 1} />
          ))}

          {isStreaming && steps.length === 0 && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-800 font-mono text-xs flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse-live" />
              <span>[INITIALIZING FORTEXA REASONING ENGINE...]</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StepRow({ step, stepNumber }: { step: AgentStep; stepNumber: number }) {
  const [isOpen, setIsOpen] = useState(false);

  const renderStatusShape = () => {
    if (step.status === "done") {
      return <span className="h-2.5 w-2.5 shrink-0 bg-blue-600 rounded-xs shadow-xs" title="DONE" />;
    } else if (step.status === "failed") {
      return <span className="font-mono font-bold text-xs leading-none text-red-600" title="FAILED">✕</span>;
    } else {
      return <span className="h-2.5 w-2.5 shrink-0 border-2 border-blue-600 bg-white animate-pulse-live rounded-xs" title="PENDING" />;
    }
  };

  const hasDetails = step.tool_input || step.output || step.reasoning;

  return (
    <Card className="relative w-full border-blue-100/90 bg-white p-4.5 shadow-xs rounded-xl transition-all duration-200 hover:border-blue-300">
      {/* Left connector marker dot on timeline */}
      <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-blue-600 bg-white shadow-xs" />

      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {renderStatusShape()}

              <span className="font-bold font-mono text-slate-900 uppercase text-xs shrink-0">
                STEP {stepNumber.toString().padStart(2, "0")}
              </span>

              {step.tool_name && (
                <Badge variant="secondary" className="text-[10px] py-0.5 px-2.5 border-blue-200 bg-blue-50 font-mono text-blue-700 font-bold shrink-0 rounded-full">
                  TOOL: {step.tool_name}
                </Badge>
              )}
            </div>

            {hasDetails && (
              <CollapsibleTrigger className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
            )}
          </div>

          <div className="font-sans text-xs text-slate-800 leading-relaxed font-medium pl-5">
            {step.step}
          </div>

          {step.reasoning && (
            <div className="font-sans text-[11px] text-slate-500 italic pl-5">
              Reasoning: {step.reasoning}
            </div>
          )}

          <CollapsibleContent className="mt-2 pt-2 border-t border-slate-100 pl-5">
            <div className="flex flex-col gap-3 font-mono text-[11px] bg-slate-900 p-4 rounded-xl text-slate-100 border border-slate-800">
              {step.tool_input && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                    RAW TOOL INPUT:
                  </span>
                  <pre className="overflow-x-auto bg-slate-950 p-3 rounded-lg border border-slate-800 text-blue-200 leading-tight">
                    <code>{JSON.stringify(step.tool_input, null, 2)}</code>
                  </pre>
                </div>
              )}

              {step.output && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                    RAW TOOL OUTPUT:
                  </span>
                  <pre className="overflow-x-auto bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-200 leading-tight whitespace-pre-wrap max-h-48">
                    <code>{step.output}</code>
                  </pre>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </Card>
  );
}

