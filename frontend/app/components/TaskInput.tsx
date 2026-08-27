"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, FileUp, Play, Trash2, FileText, Table, Terminal, Presentation } from "lucide-react";
import {
  ApiError,
  routeTask,
  runAgentStream,
  uploadFile,
  type AgentStreamEvent,
  type RouteResult,
} from "@/lib/api";

const SAMPLE_PROMPTS = [
  {
    icon: Table,
    label: "Analyze Crude Unit CSV",
    prompt: "Read attached crude_unit_log.csv, extract temperature & pressure anomalies, and generate a summary report with key metrics.",
  },
  {
    icon: FileText,
    label: "Extract PDF Spec OCR",
    prompt: "Perform OCR on the attached refinery_specification.pdf scan, parse section 4.2 compliance rules, and draft an executive summary.",
  },
  {
    icon: Terminal,
    label: "Python Sandbox Script",
    prompt: "Write a standalone Python script to calculate heat exchanger efficiency from flow rate data and execute it in Docker.",
  },
  {
    icon: Presentation,
    label: "Generate PPTX Deck",
    prompt: "Create a 5-slide PowerPoint presentation covering Q3 refinery maintenance schedule and environmental compliance metrics.",
  },
];

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

  const handleSelectSamplePrompt = (promptText: string) => {
    setTaskText(promptText);
    setError(null);
  };

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

  const handleClear = () => {
    setTaskText("");
    setSelectedFile(null);
    setFileName(null);
    setError(null);
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
    <div className="w-full border border-blue-100/90 bg-white/90 backdrop-blur-xs p-5 sm:p-7 shadow-xs hover:shadow-md transition-shadow font-sans text-xs rounded-2xl">
      <div className="flex flex-col gap-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <label htmlFor="task-input" className="font-extrabold tracking-wider text-slate-900 uppercase text-xs">
              TASK INPUT <span className="text-blue-600">//</span> COMMAND CONSOLE
            </label>
          </div>
          <Badge variant="outline" className="border-blue-200/80 bg-blue-50/60 text-blue-700 font-semibold text-[10px] py-0.5 px-2.5 rounded-full">
            100% ON-DEVICE ENCLAVE
          </Badge>
        </div>

        {/* Interactive Clickable Sample Prompt Chips */}
        <div className="flex flex-col gap-2.5">
          <span className="font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            Quick Insert Sample Tasks:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {SAMPLE_PROMPTS.map((sample, idx) => {
              const IconComp = sample.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSamplePrompt(sample.prompt)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/80 px-3.5 py-1.5 font-sans text-xs text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all cursor-pointer active:scale-95 shadow-2xs font-medium"
                >
                  <IconComp className="h-3.5 w-3.5 text-blue-600" />
                  <span>{sample.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea Command Input */}
        <div className="flex flex-col gap-1.5">
          <Textarea
            id="task-input"
            placeholder="Enter an industrial instruction or click one of the sample prompt chips above..."
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            rows={5}
            className="resize-none rounded-xl border-slate-200 bg-slate-50/30 font-mono text-xs text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-600 placeholder:text-slate-400 font-normal leading-relaxed p-4 transition-all"
          />
        </div>

        {/* File Dropzone */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Workspace Attachment (PDF, CSV, XLSX, DOCX, Scans):
            </span>
            {fileName && (
              <button
                type="button"
                onClick={() => { setSelectedFile(null); setFileName(null); }}
                className="text-[11px] text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="h-3 w-3" />
                Remove file
              </button>
            )}
          </div>

          <label
            htmlFor="file-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 border rounded-xl px-4 py-4 text-center transition-all",
              isDragOver
                ? "border-solid border-blue-600 bg-blue-50/80 shadow-xs"
                : fileName
                ? "border-solid border-blue-300 bg-blue-50/40"
                : "border-dashed border-slate-300 bg-slate-50/60 hover:bg-blue-50/30 hover:border-blue-400"
            )}
          >
            <input
              id="file-upload"
              type="file"
              accept="image/*,.pdf,.svg,.csv,.xlsx,.docx,.pptx,.txt,.json"
              onChange={handleFileChange}
              className="sr-only"
            />
            <FileUp className={cn("h-5 w-5", fileName ? "text-blue-600" : "text-slate-500")} />
            <span className={cn("font-bold text-xs", fileName ? "text-blue-700 font-mono" : "text-slate-800")}>
              {fileName ? `[ATTACHED: ${fileName}]` : "Drop PDF scan, CSV, XLSX, DOCX, PPTX or click to browse"}
            </span>
            <span className="text-[10px] text-slate-500 font-sans">
              {fileName ? "File attached to local enclave workspace" : "Stays 100% local inside air-gapped host memory"}
            </span>
          </label>
        </div>

        {/* Action Button Row */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {taskText || fileName ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="border-slate-200 text-slate-600 hover:bg-slate-100 font-mono text-xs uppercase rounded-xl"
            >
              Clear Console
            </Button>
          ) : <div />}

          <Button
            type="button"
            onClick={handleRunTask}
            disabled={!canRun}
            size="lg"
            className="rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-mono text-xs uppercase tracking-widest text-white disabled:opacity-50 h-11 px-7 cursor-pointer shadow-md shadow-blue-500/20 flex items-center gap-2.5 font-bold transition-all active:scale-[0.99]"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>{submitting ? "PROCESSING FORTEXA ENGINE..." : "RUN TASK ->"}</span>
          </Button>
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50/80 px-4 py-3 font-mono text-xs text-red-700 rounded-xl flex items-center gap-2">
            <span className="font-bold">[ERROR]:</span> {error}
          </div>
        )}
      </div>
    </div>
  );
}
