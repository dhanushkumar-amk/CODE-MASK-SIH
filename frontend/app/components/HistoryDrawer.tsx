"use client";

import { useState } from "react";
import { History, Clock, FileText, CheckCircle2, Trash2, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HistoryItem {
  id: string;
  timestamp: string;
  goal: string;
  deliverableFile?: string | null;
  stepCount: number;
}

export default function HistoryDrawer({
  history,
  onSelectRun,
  onClearHistory,
}: {
  history: HistoryItem[];
  onSelectRun?: (item: HistoryItem) => void;
  onClearHistory?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* History Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-2xs active:scale-95"
      >
        <History className="h-3.5 w-3.5 text-blue-600" />
        <span className="hidden sm:inline">Session Log</span>
        {history.length > 0 && (
          <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            {history.length}
          </span>
        )}
      </button>

      {/* History Drawer Popover Modal */}
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-2xs"
          />

          {/* Drawer Container */}
          <div className="absolute right-0 top-10 z-50 flex flex-col w-80 sm:w-96 max-h-[80vh] rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xl font-sans text-xs animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-900 text-sm">Past Session Log</span>
                <span className="text-[10px] text-slate-400 font-mono">({history.length} runs)</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Run List */}
            <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-2 my-1 pr-1">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2 text-slate-400">
                  <History className="h-8 w-8 text-slate-300" />
                  <span className="text-xs font-medium text-slate-600">No past tasks run yet</span>
                  <span className="text-[11px] text-slate-400 max-w-xs">
                    Completed demo tasks will be logged here for seamless continuity across presentation runs.
                  </span>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectRun?.(item);
                      setIsOpen(false);
                    }}
                    className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>{item.timestamp}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                        {item.stepCount} steps
                      </span>
                    </div>

                    <span className="font-medium text-slate-900 line-clamp-2 leading-relaxed text-xs">
                      {item.goal}
                    </span>

                    {item.deliverableFile && (
                      <div className="flex items-center gap-1 text-[10px] text-blue-700 font-mono font-medium pt-0.5">
                        <FileText className="h-3 w-3 text-blue-600 shrink-0" />
                        <span className="truncate">{item.deliverableFile}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer Actions */}
            {history.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer font-medium"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear Log</span>
                </button>
                <span className="text-[10px] text-slate-400 font-normal">Saved in Local Memory</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
