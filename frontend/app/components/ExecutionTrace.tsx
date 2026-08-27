"use client";

import { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
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
    <div className="w-full flex flex-col gap-4 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <span className="font-bold tracking-wider text-neutral-950 uppercase">
          EXECUTION TRACE // STEP-BY-STEP AGENT LOOP
        </span>
        <span className="text-[11px] text-neutral-500 uppercase">
          {isStreaming ? "[STREAMING...]" : result.completed ? "[DONE]" : "[IN PROGRESS]"}
        </span>
      </div>

      <ScrollArea className="w-full max-h-[520px] pr-3">
        <div className="relative flex flex-col gap-4 pl-4 border-l border-neutral-300 my-2">
          {steps.map((step, idx) => (
            <StepRow key={idx} step={step} stepNumber={idx + 1} />
          ))}

          {isStreaming && steps.length === 0 && (
            <div className="p-4 border border-neutral-200 bg-neutral-50 text-neutral-600 font-mono text-xs">
              [INITIALIZING AGENT REASONING ENGINE...]
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StepRow({ step, stepNumber }: { step: AgentStep; stepNumber: number }) {
  const [isOpen, setIsOpen] = useState(false);

  // Shape-based status indicator (Strict: NO COLORED ICONS!)
  const renderStatusShape = () => {
    if (step.status === "done") {
      // Filled black dot / square for done
      return <span className="h-2.5 w-2.5 shrink-0 bg-neutral-950" title="DONE" />;
    } else if (step.status === "failed") {
      // X mark for failed
      return <span className="font-mono font-bold text-xs leading-none text-neutral-950" title="FAILED">✕</span>;
    } else {
      // Outlined square for running / pending
      return <span className="h-2.5 w-2.5 shrink-0 border border-neutral-950 bg-white animate-pulse-subtle" title="PENDING" />;
    }
  };

  const hasDetails = step.tool_input || step.output || step.reasoning;

  return (
    <Card className="relative w-full border-neutral-300 bg-white p-3.5 shadow-none rounded-none transition-all duration-200 animate-in fade-in slide-in-from-bottom-1">
      {/* Left connector marker dot on timeline */}
      <span className="absolute -left-[21px] top-4 h-2 w-2 rounded-full border border-neutral-400 bg-white" />

      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Shape Status Indicator */}
              {renderStatusShape()}

              {/* Mono Step Number */}
              <span className="font-bold text-neutral-950 uppercase text-xs shrink-0">
                STEP {stepNumber.toString().padStart(2, "0")}
              </span>

              {/* Tool or action label */}
              {step.tool_name && (
                <span className="border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase font-bold text-neutral-800 shrink-0">
                  TOOL: {step.tool_name}
                </span>
              )}
            </div>

            {/* Collapsible trigger arrow */}
            {hasDetails && (
              <CollapsibleTrigger className="p-1 hover:bg-neutral-100 transition-colors">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-neutral-950" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-neutral-950" />
                )}
              </CollapsibleTrigger>
            )}
          </div>

          {/* User-facing description in clean sans font */}
          <div className="font-sans text-xs text-neutral-800 leading-relaxed font-medium pl-5">
            {step.step}
          </div>

          {/* Reasoning summary if available */}
          {step.reasoning && (
            <div className="font-sans text-[11px] text-neutral-500 italic pl-5">
              Reasoning: {step.reasoning}
            </div>
          )}

          {/* Expandable Section with Raw Tool Input & Output */}
          <CollapsibleContent className="mt-2 pt-2 border-t border-neutral-200 pl-5">
            <div className="flex flex-col gap-3 font-mono text-[11px] bg-neutral-50 p-3 border border-neutral-200">
              {step.tool_input && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">
                    RAW TOOL INPUT:
                  </span>
                  <pre className="overflow-x-auto bg-white p-2 border border-neutral-200 text-neutral-900 leading-tight">
                    <code>{JSON.stringify(step.tool_input, null, 2)}</code>
                  </pre>
                </div>
              )}

              {step.output && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">
                    RAW TOOL OUTPUT:
                  </span>
                  <pre className="overflow-x-auto bg-white p-2 border border-neutral-200 text-neutral-900 leading-tight whitespace-pre-wrap max-h-48">
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
