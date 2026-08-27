"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import Navbar from "@/app/components/Navbar";
import StatusReadout from "@/app/components/StatusReadout";
import ProblemSection from "@/app/components/ProblemSection";
import ArchitectureSection from "@/app/components/ArchitectureSection";
import ProofSection from "@/app/components/ProofSection";
import Footer from "@/app/components/Footer";
import TaskInput from "@/app/components/TaskInput";
import RoutingPanel from "@/app/components/RoutingPanel";
import ExecutionTrace from "@/app/components/ExecutionTrace";
import OutputPanel from "@/app/components/OutputPanel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type AgentRunResult,
  type AgentStreamEvent,
  type RouteResult,
} from "@/lib/api";

export default function Home() {
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [agentResult, setAgentResult] = useState<AgentRunResult | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<"new-task" | "history">("new-task");

  const scrollToWorkbench = () => {
    const el = document.getElementById("workbench");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleResetTask = () => {
    setRouteResult(null);
    setAgentResult(null);
    setIsStreaming(false);
    scrollToWorkbench();
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
    <div className="flex flex-col md:flex-row min-h-screen bg-white text-neutral-950 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Persistent Left Sidebar (~240px wide, collapses to top bar on mobile) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onResetTask={handleResetTask}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Sticky Header Navbar */}
        <Navbar onLaunchClick={scrollToWorkbench} />

        {activeTab === "history" ? (
          <div className="p-8 font-mono text-xs text-neutral-600 flex flex-col gap-4 max-w-3xl">
            <h2 className="text-xl font-bold text-neutral-950">TASK HISTORY // AUDIT LOG</h2>
            <div className="border border-neutral-300 bg-neutral-50 p-6 text-center">
              [STUB MODE]: Historical task logs are archived in local SQLite database on localhost:8000.
            </div>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <section className="w-full bg-white py-12 sm:py-20 border-b border-neutral-200">
              <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                  {/* Hero Copy */}
                  <div className="lg:col-span-7 flex flex-col gap-5">
                    <Badge variant="secondary" className="border-neutral-300 self-start py-1 px-3">
                      <span className="h-2 w-2 rounded-full bg-neutral-950 animate-pulse-subtle mr-1.5" />
                      SYSTEM CLASSIFICATION: UNRESTRICTED ON-PREMISE
                    </Badge>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-950 font-sans leading-[1.1]">
                      AI that never leaves the building.
                    </h1>

                    <p className="text-sm sm:text-base text-neutral-600 font-sans leading-relaxed">
                      Purpose-built, self-hosted AI agent system for oil refineries, defense, and power grids where confidential data can never touch cloud APIs.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button
                        variant="default"
                        size="lg"
                        onClick={scrollToWorkbench}
                        className="font-mono text-xs uppercase tracking-wider"
                      >
                        Launch Console →
                      </Button>
                      <a
                        href="#proof"
                        className={buttonVariants({ variant: "outline", size: "lg", className: "border-neutral-300" })}
                      >
                        Offline Verification
                      </a>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t border-neutral-200 pt-5 font-mono text-[11px] text-neutral-500 uppercase tracking-wider">
                      <div>
                        <span className="block font-bold text-neutral-950 text-sm">0 B/s</span>
                        Outbound Telemetry
                      </div>
                      <div>
                        <span className="block font-bold text-neutral-950 text-sm">100%</span>
                        On-Device Processing
                      </div>
                      <div>
                        <span className="block font-bold text-neutral-950 text-sm">DOCKER</span>
                        Network-None Enclave
                      </div>
                    </div>
                  </div>

                  {/* Signature Hero Element: Status Readout Panel */}
                  <div className="lg:col-span-5 w-full">
                    <StatusReadout />
                  </div>
                </div>
              </div>
            </section>

            {/* Problem Section */}
            <ProblemSection />

            {/* How It Works / Architecture Section */}
            <ArchitectureSection />

            {/* Proof Section */}
            <ProofSection />

            {/* Interactive Working Workbench Console */}
            <section id="workbench" className="w-full border-t border-neutral-200 bg-white py-12 sm:py-20">
              <div className="mx-auto max-w-4xl px-4 sm:px-6 flex flex-col gap-6">
                <div className="flex flex-col gap-1.5 border-b border-neutral-200 pb-4">
                  <span className="font-mono text-xs uppercase tracking-widest text-neutral-500 font-semibold">
                    OPERATOR WORKBENCH // ON-PREMISE ENGINE
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-950 font-sans">
                    Live On-Device Agent Execution Console
                  </h2>
                  <p className="text-xs text-neutral-600 font-sans">
                    Submit industrial instructions, analyze scans/documents, and inspect real-time agent execution traces.
                  </p>
                </div>

                {/* 1. TaskInput Component */}
                <TaskInput
                  onRunStart={handleRunStart}
                  onRouteReady={handleRouteReady}
                  onAgentEvent={handleAgentEvent}
                />

                {/* 2. RoutingPanel Component */}
                {routeResult && <RoutingPanel route={routeResult} />}

                {/* 3. ExecutionTrace Component */}
                {agentResult && (
                  <div className="w-full border border-neutral-300 bg-white p-5 sm:p-6 shadow-none">
                    <ExecutionTrace
                      result={agentResult}
                      isStreaming={isStreaming}
                    />
                  </div>
                )}

                {/* 4. OutputPanel Component */}
                {agentResult && (agentResult.completed || !isStreaming) && (
                  <OutputPanel
                    output={deliverable?.output}
                    filename={deliverable?.filename}
                    codeResult={deliverable?.codeResult}
                  />
                )}
              </div>
            </section>
          </>
        )}

        {/* Minimal Monospace Footer */}
        <Footer />
      </div>
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
