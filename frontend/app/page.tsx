"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/app/components/Navbar";
import TaskInput from "@/app/components/TaskInput";
import ExecutionTrace from "@/app/components/ExecutionTrace";
import OutputPanel from "@/app/components/OutputPanel";
import { type HistoryItem } from "@/app/components/HistoryDrawer";
import { User, CheckCircle2, Sparkles } from "lucide-react";
import { playCompletionChime } from "@/lib/sound";
import { addAdminAuditLog } from "@/lib/adminLog";
import { getActiveUserSession, type UserAccount } from "@/lib/userAuth";
import {
  type AgentRunResult,
  type AgentStreamEvent,
  type RouteResult,
} from "@/lib/api";

export default function Home() {
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [agentResult, setAgentResult] = useState<AgentRunResult | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [filesGenerated, setFilesGenerated] = useState(0);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [runsMap, setRunsMap] = useState<Record<string, AgentRunResult>>({});
  const [activeUser, setActiveUser] = useState<UserAccount | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load history & user session from localStorage on mount
  useEffect(() => {
    try {
      const savedHist = localStorage.getItem("fortexa_history_items");
      const savedMap = localStorage.getItem("fortexa_history_map");
      if (savedHist) setHistory(JSON.parse(savedHist));
      if (savedMap) setRunsMap(JSON.parse(savedMap));
      const currUser = getActiveUserSession();
      setActiveUser(currUser);
    } catch (e) {
      console.warn("Failed to load session history from storage", e);
    }
  }, []);

  // Auto scroll down as new responses stream in
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentResult, isStreaming]);

  const handleResetConsole = () => {
    setRouteResult(null);
    setAgentResult(null);
    setIsStreaming(false);
    setShowCompletionBanner(false);
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
    setShowCompletionBanner(false);
  };

  const handleRouteReady = (route: RouteResult) => {
    setRouteResult(route);
  };

  const handleSelectHistoryRun = (item: HistoryItem) => {
    const saved = runsMap[item.id];
    if (saved) {
      setAgentResult(saved);
      setIsStreaming(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    setRunsMap({});
    localStorage.removeItem("fortexa_history_items");
    localStorage.removeItem("fortexa_history_map");
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

      // Trigger Completion Audio Chime & Visual Stats
      playCompletionChime();
      setTasksCompleted((prev) => prev + 1);
      setShowCompletionBanner(true);

      // Check if file deliverable generated
      let deliverableFile: string | null = null;
      const fileStep = event.results?.find((step) =>
        step.output?.match(/\b([\w-]+\.(pptx|docx|xlsx|csv|pdf|txt|json|py|html))\b/i) ||
        (step.tool_input && typeof step.tool_input === "object" && "output_file" in step.tool_input)
      );
      if (fileStep) {
        setFilesGenerated((prev) => prev + 1);
        const match = fileStep.output?.match(/\b([\w-]+\.(pptx|docx|xlsx|csv|pdf|txt|json|py|html))\b/i);
        deliverableFile = match ? match[1] : (fileStep.tool_input as { output_file?: string })?.output_file || null;
      }

      // Save to History Log
      const runId = `run_${Date.now()}`;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newItem: HistoryItem = {
        id: runId,
        timestamp: nowStr,
        goal: event.goal,
        deliverableFile,
        stepCount: event.results?.length ?? 0,
      };

      setHistory((prev) => {
        const updated = [newItem, ...prev];
        try { localStorage.setItem("fortexa_history_items", JSON.stringify(updated)); } catch (e) { }
        return updated;
      });

      setRunsMap((prev) => {
        const updated = { ...prev, [runId]: event };
        try { localStorage.setItem("fortexa_history_map", JSON.stringify(updated)); } catch (e) { }
        return updated;
      });

      // Save to Admin Audit Log (Last 30 records)
      try {
        const usedTools = event.results?.map((r) => r.tool_name).filter(Boolean) as string[] || [];
        const taskType = routeResult?.task_type || "document";
        const modelUsed = routeResult?.model || "qwen2.5:1.5b-instruct";
        addAdminAuditLog({
          prompt: event.goal,
          task_type: taskType as any,
          model: modelUsed,
          tools_used: Array.from(new Set(usedTools)),
          deliverable: deliverableFile,
          status: event.completed ? "success" : "failed",
        });
      } catch (err) {
        console.error("[ADMIN LOG] Sync error:", err);
      }

      // Hide completion banner after 4s
      setTimeout(() => setShowCompletionBanner(false), 4000);
    } else if (event.event === "error") {
      setIsStreaming(false);
    }
  };

  // Helper to extract deliverable filename or code output from agent run results
  const getDeliverable = () => {
    if (!agentResult) return null;
    let filename: string | null = null;
    let codeResult: string | null = null;
    const stepOutputs: string[] = [];

    for (const step of agentResult.results) {
      if (step.output) {
        if (!stepOutputs.includes(step.output)) {
          stepOutputs.push(step.output);
        }

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
      output: stepOutputs.join("\n\n").trim(),
    };
  };

  const deliverable = getDeliverable();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans relative selection:bg-blue-600 selection:text-white">
      {/* Top Header with Session Log & Actions */}
      <Navbar
        onResetConsole={handleResetConsole}
        tasksCompleted={tasksCompleted}
        filesGenerated={filesGenerated}
        externalCalls={0}
        history={history}
        onSelectRun={handleSelectHistoryRun}
        onClearHistory={handleClearHistory}
        onUserChanged={(u) => setActiveUser(u)}
      />

      {/* Scrollable Conversation Stream Window */}
      <main className="flex-1 w-full overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 min-h-full">
          {/* Landing View (when no task is running) */}
          {!agentResult ? (
            <div className="flex flex-col gap-8 my-auto py-12">
              <div className="flex flex-col items-center text-center gap-1.5">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                  What can I help with today?
                </h1>
              </div>

              {/* 4 ChatGPT Style Quick Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto w-full">
                <button
                  onClick={() => handleRunStart("Read attached crude_unit_log.csv, extract temperature & pressure anomalies, and generate a summary report with key metrics.")}
                  className="flex flex-col gap-1 text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100/70 transition-all cursor-pointer shadow-2xs group"
                >
                  <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                    Analyze Crude Unit Log CSV
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Extract temperature & pressure anomalies
                  </span>
                </button>

                <button
                  onClick={() => handleRunStart("Perform OCR on the attached refinery_specification.pdf scan, parse section 4.2 compliance rules, and draft an executive summary.")}
                  className="flex flex-col gap-1 text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100/70 transition-all cursor-pointer shadow-2xs group"
                >
                  <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                    Extract PDF Spec OCR Rules
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Parse compliance section rules from scans
                  </span>
                </button>

                <button
                  onClick={() => handleRunStart("Write a Java program to check if a given number is odd or even.")}
                  className="flex flex-col gap-1 text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100/70 transition-all cursor-pointer shadow-2xs group"
                >
                  <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                    Write Java & Python Code
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Generate odd/even check or efficiency script
                  </span>
                </button>

                <button
                  onClick={() => handleRunStart("Create a 5-slide PowerPoint presentation covering Q3 refinery maintenance schedule and environmental metrics.")}
                  className="flex flex-col gap-1 text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100/70 transition-all cursor-pointer shadow-2xs group"
                >
                  <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                    Generate PPTX Presentation
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Create maintenance & environmental deck
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Conversation Stream */
            <div className="flex flex-col gap-6 pb-6 my-auto">
              {/* Animated Task Completion Toast Banner */}
              {showCompletionBanner && (
                <div className="flex items-center justify-between gap-3 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-md animate-in fade-in slide-in-from-top-2 duration-300 font-sans text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-white shrink-0 animate-bounce" />
                    <span>Task Completed Successfully! Deliverable Ready.</span>
                  </div>
                  <span className="text-[10px] bg-emerald-700/80 px-2.5 py-0.5 rounded-full font-mono font-medium">
                    0 External Calls
                  </span>
                </div>
              )}

              {/* User Prompt Message Bubble */}
              <div className="flex gap-3 justify-end items-start pt-2">
                <div className="bg-slate-200/70 text-slate-900 px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-xl text-sm font-medium leading-relaxed shadow-2xs">
                  {agentResult.goal}
                </div>
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    activeUser ? `${activeUser.avatarColor} text-white` : "bg-slate-200 text-slate-700"
                  } font-bold text-xs mt-0.5 shadow-2xs`}
                  title={activeUser?.name || "User"}
                >
                  {activeUser ? activeUser.name.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5 text-slate-700" />}
                </div>
              </div>

              {/* Collapsible Reasoning & Steps Drawer */}
              <ExecutionTrace
                result={agentResult}
                isStreaming={isStreaming}
                route={routeResult}
              />

              {/* AI Assistant Output Deliverable */}
              {(agentResult.completed || !isStreaming || (deliverable?.output && deliverable.output.length > 0)) && (
                <OutputPanel
                  output={deliverable?.output}
                  filename={deliverable?.filename}
                  codeResult={deliverable?.codeResult}
                />
              )}

              {/* Scroll Anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* FIXED BOTTOM PROMPT INPUT BAR */}
      <div className="shrink-0 w-full bg-slate-50/95 backdrop-blur-md pt-2 pb-4 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <TaskInput
            onRunStart={handleRunStart}
            onRouteReady={handleRouteReady}
            onAgentEvent={handleAgentEvent}
            hideSuggestions={true}
          />
        </div>
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


