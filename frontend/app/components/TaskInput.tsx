"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Paperclip,
  ArrowUp,
  X,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCode,
  Files,
  Loader2,
  Mic,
} from "lucide-react";
import {
  ApiError,
  routeTask,
  runAgentStream,
  uploadFile,
  transcribeVoice,
  type AgentStreamEvent,
  type RouteResult,
} from "@/lib/api";

export default function TaskInput({
  onRouteReady,
  onAgentEvent,
  onRunStart,
  hideSuggestions = false,
}: {
  onRouteReady?: (route: RouteResult) => void;
  onAgentEvent?: (event: AgentStreamEvent) => void;
  onRunStart?: (goal: string) => void;
  hideSuggestions?: boolean;
}) {
  const [taskText, setTaskText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [fileAccept, setFileAccept] = useState<string>("*/*");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canRun = (taskText.trim().length > 0 || fileName !== null) && !submitting && !isRecording;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size > 0) {
          setIsTranscribing(true);
          try {
            const transcribedText = await transcribeVoice(audioBlob);
            if (transcribedText && transcribedText.trim()) {
              setTaskText((prev) => (prev ? `${prev} ${transcribedText.trim()}` : transcribedText.trim()));
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Voice transcription failed.");
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError("Microphone access denied or unreadable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFileName(file ? file.name : null);
    setShowAttachMenu(false);
  };

  const handleOpenPicker = (acceptTypes: string) => {
    setFileAccept(acceptTypes);
    setShowAttachMenu(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
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

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileName(null);
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

      // Clear input fields immediately for snappy chat response
      setTaskText("");
      setSelectedFile(null);
      setFileName(null);

      onRunStart?.(goal);

      const routing = await routeTask(goal);
      onRouteReady?.(routing);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRunTask();
    }
  };

  return (
    <div className="w-full flex flex-col gap-2 font-sans text-xs relative">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={fileAccept}
        onChange={handleFileChange}
        className="sr-only"
      />

      {/* Main Unified ChatGPT Floating Prompt Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col w-full rounded-3xl border bg-white p-3 sm:px-4 sm:py-3.5 shadow-xs transition-all duration-200",
          isDragOver
            ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20"
            : "border-slate-300/80 focus-within:border-slate-400 hover:border-slate-300"
        )}
      >
        {/* Attached File Chip Preview */}
        {fileName && (
          <div className="mb-2 flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-slate-100/80 px-2.5 py-1 text-xs text-slate-800 font-mono">
            <Paperclip className="h-3.5 w-3.5 text-blue-600" />
            <span className="truncate max-w-xs font-medium">{fileName}</span>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="ml-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Text Area */}
        <textarea
          id="task-input"
          placeholder="Message Fortexa..."
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="w-full resize-none border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none leading-relaxed font-sans px-1"
        />

        {/* Bottom Toolbar & Round Send Button */}
        <div className="flex items-center justify-between pt-1 relative">
          {/* Attachment Button & Voice Button Group */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
              >
                <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                <span>{fileName ? "Change" : "Attach"}</span>
              </button>

              {/* Ultra-Minimal Attach Menu Dropdown */}
              {showAttachMenu && (
                <div className="absolute bottom-10 left-0 z-50 flex flex-col w-44 rounded-xl border border-slate-200/90 bg-white p-1 shadow-md font-sans text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button
                    type="button"
                    onClick={() => handleOpenPicker(".pdf,.docx,.doc,.txt")}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100/80 transition-colors text-left font-medium cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>Document / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPicker(".csv,.xlsx,.xls")}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100/80 transition-colors text-left font-medium cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>CSV Data</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPicker("image/*,.svg")}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100/80 transition-colors text-left font-medium cursor-pointer"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    <span>Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPicker(".py,.java,.js,.ts,.json,.sh")}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100/80 transition-colors text-left font-medium cursor-pointer"
                  >
                    <FileCode className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>Code File</span>
                  </button>

                  <div className="h-px bg-slate-100 my-0.5" />

                  <button
                    type="button"
                    onClick={() => handleOpenPicker("*/*")}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-500 hover:bg-slate-100/80 transition-colors text-left font-normal cursor-pointer"
                  >
                    <Files className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Any File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Offline Voice Mic Input Button */}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isTranscribing}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all cursor-pointer",
                isRecording
                  ? "bg-slate-900 text-white border-slate-900 shadow-md animate-pulse"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  <span className="font-mono text-[11px] text-blue-700">Transcribing...</span>
                </>
              ) : isRecording ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="font-mono text-[11px] text-white">Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5 text-slate-500" />
                  <span>Voice</span>
                </>
              )}
            </button>
          </div>

          {/* ChatGPT Style Round Send Button */}
          <button
            type="button"
            onClick={handleRunTask}
            disabled={!canRun}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-20 hover:bg-blue-700 transition-all cursor-pointer shadow-2xs shrink-0"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <ArrowUp className="h-4 w-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>

      {/* ChatGPT Disclaimer */}
      <span className="text-[11px] text-slate-400 text-center font-normal px-2">
        Fortexa can make mistakes. Runs 100% locally on-device inside air-gapped memory.
      </span>

      {error && (
        <div className="border border-red-200 bg-red-50/80 px-4 py-2 font-sans text-xs text-red-700 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}




