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
    <div className="w-full flex flex-col gap-4 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#26272D] pb-3">
        <span className="font-bold tracking-wider text-white uppercase text-xs flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white" />
          EXECUTION TRACE // STEP-BY-STEP AGENT LOOP
        </span>
        <Badge variant="outline" className="text-[10px] border-[#2E303A] font-mono bg-[#181920] text-[#E2E8F0]">
          {isStreaming ? "[STREAMING...]" : result.completed ? "[COMPLETED]" : "[IN PROGRESS]"}
        </Badge>
      </div>

      <ScrollArea className="w-full max-h-[520px] pr-3">
        <div className="relative flex flex-col gap-4 pl-4 border-l border-[#26272D] my-2">
          {steps.map((step, idx) => (
            <StepRow key={idx} step={step} stepNumber={idx + 1} />
          ))}

          {isStreaming && steps.length === 0 && (
            <div className="p-4 rounded-xl border border-[#26272D] bg-[#121318] text-[#8A8F98] font-mono text-xs flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
              <span>[INITIALIZING AGENT REASONING ENGINE...]</span>
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
      return <span className="h-2.5 w-2.5 shrink-0 bg-white rounded-xs" title="DONE" />;
    } else if (step.status === "failed") {
      return <span className="font-mono font-bold text-xs leading-none text-white" title="FAILED">✕</span>;
    } else {
      return <span className="h-2.5 w-2.5 shrink-0 border border-white bg-transparent animate-pulse-dot rounded-xs" title="PENDING" />;
    }
  };

  const hasDetails = step.tool_input || step.output || step.reasoning;

  return (
    <Card className="relative w-full border-[#26272D] bg-[#14151A] p-4 shadow-lg shadow-black/40 rounded-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-1">
      {/* Left connector marker dot on timeline */}
      <span className="absolute -left-[21px] top-4.5 h-2.5 w-2.5 rounded-full border border-[#3A3C46] bg-[#14151A]" />

      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Shape Status Indicator */}
              {renderStatusShape()}

              {/* Mono Step Number */}
              <span className="font-bold text-white uppercase text-xs shrink-0">
                STEP {stepNumber.toString().padStart(2, "0")}
              </span>

              {/* Tool or action label */}
              {step.tool_name && (
                <Badge variant="secondary" className="text-[9px] py-0 px-2 border-[#2E303A] bg-[#1E1F26] font-mono text-[#E2E8F0] shrink-0">
                  TOOL: {step.tool_name}
                </Badge>
              )}
            </div>

            {/* Collapsible trigger arrow */}
            {hasDetails && (
              <CollapsibleTrigger className="p-1.5 rounded-lg hover:bg-[#1E1F26] transition-colors">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-white" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-white" />
                )}
              </CollapsibleTrigger>
            )}
          </div>

          {/* User-facing description in clean sans font */}
          <div className="font-sans text-xs text-[#E2E8F0] leading-relaxed font-medium pl-5">
            {step.step}
          </div>

          {/* Reasoning summary if available */}
          {step.reasoning && (
            <div className="font-sans text-[11px] text-[#8A8F98] italic pl-5">
              Reasoning: {step.reasoning}
            </div>
          )}

          {/* Expandable Section with Raw Tool Input & Output */}
          <CollapsibleContent className="mt-2 pt-2 border-t border-[#1F2026] pl-5">
            <div className="flex flex-col gap-3 font-mono text-[11px] bg-[#0E0F13] p-3.5 rounded-xl border border-[#26272D]">
              {step.tool_input && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[#8A8F98] uppercase">
                    RAW TOOL INPUT:
                  </span>
                  <pre className="overflow-x-auto bg-[#14151A] p-2.5 rounded-lg border border-[#26272D] text-white leading-tight">
                    <code>{JSON.stringify(step.tool_input, null, 2)}</code>
                  </pre>
                </div>
              )}

              {step.output && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[#8A8F98] uppercase">
                    RAW TOOL OUTPUT:
                  </span>
                  <pre className="overflow-x-auto bg-[#14151A] p-2.5 rounded-lg border border-[#26272D] text-white leading-tight whitespace-pre-wrap max-h-48">
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
