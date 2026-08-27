"use client";

import { useState } from "react";
import Navbar from "@/app/components/Navbar";
import StatusReadout from "@/app/components/StatusReadout";
import TaskInput from "@/app/components/TaskInput";
import RoutingPanel from "@/app/components/RoutingPanel";
import ExecutionTrace from "@/app/components/ExecutionTrace";
import OutputPanel from "@/app/components/OutputPanel";
import Footer from "@/app/components/Footer";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import {
  type AgentRunResult,
  type AgentStreamEvent,
  type RouteResult,
} from "@/lib/api";

export default function Home() {
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [agentResult, setAgentResult] = useState<AgentRunResult | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleResetConsole = () => {
    setRouteResult(null);
    setAgentResult(null);
    setIsStreaming(false);
  };

  const handleRunStart = (goal: string) => {
    setRouteResult(null);
    setAgentResult({
      goal,
      plan: [],
      results: [],
      completed: false,
    });
    setIsStreaming(true);
  };

  const handleRouteReady = (route: RouteResult) => {
    setRouteResult(route);
  };

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
        prev ? { ...prev, results: upsertStep(prev.results, event) } : prev
      );
    } else if (event.event === "done") {
      setAgentResult(event);
      setIsStreaming(false);
    } else if (event.event === "error") {
      setIsStreaming(false);
    }
  };

  // Helper to extract deliverable filename or code output from agent run results
  const getDeliverable = () => {
    if (!agentResult) return null;
    let filename: string | null = null;
    let codeResult: string | null = null;
    let textOutput = "";

    const lastStep = agentResult.results[agentResult.results.length - 1];

    for (const step of agentResult.results) {
      if (step.output) {
        textOutput += step.output + "\n\n";

        // Check for generated files in output or tool input
        const match = step.output.match(/\b([\w-]+\.(pptx|docx|xlsx|csv|pdf|txt|json|py|html))\b/i);
        if (match) {
          filename = match[1];
        }

        if (step.tool_input && typeof step.tool_input === "object" && "output_file" in step.tool_input) {
          filename = String(step.tool_input.output_file);
        }

        // Check if output is a code snippet
        if (step.output.includes("```") || step.tool_name === "execute_code") {
          codeResult = step.output;
        }
      }
    }

    return {
      filename,
      codeResult,
      output: lastStep?.output || textOutput.trim(),
    };
  };

  const deliverable = getDeliverable();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white relative bg-tech-grid">
      <div className="absolute inset-0 bg-blue-glow pointer-events-none" />

      {/* 1. Header Bar */}
      <Navbar onResetConsole={handleResetConsole} />

      {/* 2. Main Console Workspace */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 relative z-10">
        {/* Console Hero Banner */}
        <div className="flex flex-col gap-3 border-b border-blue-100/80 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200/80 font-bold py-1 px-3 w-fit text-[10px] rounded-full shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse-live mr-1.5" />
              FORTEXA AIR-GAPPED ON-PREMISE AI AGENT
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
              <span>ZERO CLOUD TELEMETRY // LOCAL MEMORY ONLY</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-sans">
              FORTEXA <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">Operator Console</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed max-w-3xl">
              Self-hosted AI agent engine for oil refineries, defense, and heavy industry. Click sample prompts below or attach documents to process 100% on-device.
            </p>
          </div>
        </div>

        {/* 1. Main Task Input Panel with Sample Prompt Chips */}
        <TaskInput
          onRunStart={handleRunStart}
          onRouteReady={handleRouteReady}
          onAgentEvent={handleAgentEvent}
        />

        {/* 2. Live System Status Readout Telemetry Dashboard */}
        <StatusReadout />

        {/* 3. Router Decision Log */}
        {routeResult && <RoutingPanel route={routeResult} />}

        {/* 4. Agent Step Execution Trace */}
        {agentResult && (
          <div className="w-full border border-blue-100/90 bg-white/90 p-6 sm:p-8 rounded-2xl shadow-xs">
            <ExecutionTrace
              result={agentResult}
              isStreaming={isStreaming}
            />
          </div>
        )}

        {/* 5. Final Deliverable Output Panel */}
        {agentResult && (agentResult.completed || !isStreaming) && (
          <OutputPanel
            output={deliverable?.output}
            filename={deliverable?.filename}
            codeResult={deliverable?.codeResult}
          />
        )}
      </main>

      {/* 3. Footer */}
      <Footer />
    </div>
  );
}

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
