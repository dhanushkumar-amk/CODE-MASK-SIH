"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ApiError,
  routeTask,
  runAgentStream,
  uploadFile,
  type AgentStreamEvent,
  type RouteResult,
} from "@/lib/api";

export default function TaskInput({
  onRouteReady,
  onAgentEvent,
  onRunStart,
}: {
  onRouteReady?: (route: RouteResult) => void;
  onAgentEvent?: (event: AgentStreamEvent) => void;
  onRunStart?: (goal: string) => void;
}) {
  const [taskText, setTaskText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun = (taskText.trim().length > 0 || fileName !== null) && !submitting;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFileName(file ? file.name : null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleRunTask = async () => {
    if (!canRun) return;

    setError(null);
    setSubmitting(true);

    try {
      if (selectedFile) {
        await uploadFile(selectedFile);
      }

      const rawText = taskText.trim();
      let goal = rawText;
      if (fileName) {
        if (!rawText) {
          goal = `Process, extract and analyze data from attached file ${fileName}`;
        } else {
          goal = `${rawText} (attached file: ${fileName})`;
        }
      }

      if (!goal) {
        setError("Enter a task description or attach a file to run.");
        return;
      }

      onRunStart?.(goal);

      // Step 1: Call POST /route first to get router decision
      const routing = await routeTask(goal);
      onRouteReady?.(routing);

      // Step 2: Open SSE stream from POST /agent/run/stream
      await runAgentStream(goal, (event) => {
        onAgentEvent?.(event);
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Unexpected error while running the task.";
      setError(message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full border border-[#26272D] bg-[#14151A] p-5 sm:p-6 shadow-xl shadow-black/40 font-mono text-xs rounded-2xl">
      <div className="flex flex-col gap-4">
        {/* Monospace label above textarea */}
        <div className="flex items-center justify-between border-b border-[#202128] pb-2.5">
          <label htmlFor="task-input" className="font-bold tracking-wider text-white uppercase text-xs flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-white" />
            TASK INPUT
          </label>
          <span className="text-[10px] text-[#8A8F98] uppercase tracking-widest font-semibold">
            COMMAND CONSOLE
          </span>
        </div>

        {/* Large bordered textarea (command feel) */}
        <Textarea
          id="task-input"
          placeholder="Enter industrial instruction or request (e.g. 'Analyze attached crude_unit_log.csv for pressure anomalies and draft summary report')"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          rows={5}
          className="resize-none rounded-xl border-[#26272D] bg-[#121318] font-sans text-sm text-white focus-visible:ring-white/30 focus-visible:border-white/40 placeholder:text-[#525660]"
        />

        {/* File Dropzone (Dashed border, becomes solid on drag-over) */}
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold text-[#8A8F98] uppercase tracking-wider text-[11px]">
            WORKSPACE ATTACHMENT / SCAN DROP ZONE
          </span>
          <label
            htmlFor="file-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 border rounded-xl bg-[#181920] px-4 py-4 text-center transition-all",
              isDragOver
                ? "border-solid border-white bg-[#20212B]"
                : "border-dashed border-[#2E303A] hover:bg-[#1E1F27]"
            )}
          >
            <input
              id="file-upload"
              type="file"
              accept="image/*,.pdf,.svg,.csv,.xlsx,.docx,.pptx,.txt,.json"
              onChange={handleFileChange}
              className="sr-only"
            />
            <span className="font-bold text-white">
              {fileName ? `[ATTACHED: ${fileName}]` : "Drop document, PDF scan, spreadsheet, or click to browse"}
            </span>
            <span className="text-[11px] text-[#8A8F98]">
              {fileName ? "Uploaded to local enclave workspace" : "Accepts PDF, CSV, XLSX, DOCX, PPTX, PNG, JPG — stays local"}
            </span>
          </label>
        </div>

        {/* White "Run Task ->" Button */}
        <Button
          type="button"
          onClick={handleRunTask}
          disabled={!canRun}
          size="lg"
          className="w-full rounded-xl bg-white font-mono text-xs font-bold uppercase tracking-widest text-black hover:bg-neutral-200 disabled:opacity-50 h-11 cursor-pointer shadow-md"
        >
          {submitting ? "PROCESSING LOCAL ENGINE..." : "RUN TASK ->"}
        </Button>

        {error && (
          <div className="border border-red-800/60 bg-red-950/40 rounded-xl px-4 py-2.5 font-mono text-xs text-red-300">
            [ERROR]: {error}
          </div>
        )}
      </div>
    </div>
  );
}
