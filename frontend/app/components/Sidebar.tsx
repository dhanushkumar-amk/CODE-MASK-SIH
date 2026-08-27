"use client";

import NetworkStatusBadge from "@/app/components/NetworkStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Sidebar({
  activeTab = "new-task",
  onSelectTab,
  onResetTask,
}: {
  activeTab?: "new-task" | "history";
  onSelectTab?: (tab: "new-task" | "history") => void;
  onResetTask?: () => void;
}) {
  return (
    <aside className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-neutral-200 bg-white font-mono text-xs text-neutral-900 flex flex-col justify-between">
      <div className="flex flex-col p-4 sm:p-5 gap-6">
        {/* Logo & System Badge */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold tracking-tight text-neutral-950 text-sm uppercase">
              SOVEREIGN
            </span>
            <Badge variant="outline" className="text-[9px] border-neutral-300">
              v1.0
            </Badge>
          </div>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
            WORKBENCH // CONSOLE
          </span>
        </div>

        {/* Network Status Badge (Always Visible) */}
        <div className="flex flex-col gap-1.5 border-y border-neutral-200 py-3">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">
            TELEMETRY MONITOR
          </span>
          <NetworkStatusBadge className="w-full justify-center" />
        </div>

        {/* System Environment Info */}
        <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4 text-[11px]">
          <div className="flex justify-between items-center text-neutral-600">
            <span className="uppercase text-neutral-500">MODEL:</span>
            <span className="font-semibold text-neutral-950">qwen2.5:1.5b</span>
          </div>
          <div className="flex justify-between items-center text-neutral-600">
            <span className="uppercase text-neutral-500">ENCLAVE:</span>
            <span className="font-semibold text-neutral-950">docker --none</span>
          </div>
          <div className="flex justify-between items-center text-neutral-600">
            <span className="uppercase text-neutral-500">HOST:</span>
            <span className="font-semibold text-neutral-950">127.0.0.1</span>
          </div>
        </div>

        {/* Operator Console Navigation */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">
            OPERATOR NAVIGATION
          </span>
          <Button
            variant={activeTab === "new-task" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              onSelectTab?.("new-task");
              onResetTask?.();
            }}
            className="w-full justify-start font-mono text-xs uppercase"
          >
            + NEW TASK
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectTab?.("history")}
            className="w-full justify-between font-mono text-xs uppercase"
          >
            <span>TASK HISTORY</span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0 border-neutral-300">
              STUB
            </Badge>
          </Button>
        </div>
      </div>

      {/* Footer info inside sidebar */}
      <div className="p-4 border-t border-neutral-200 text-[10px] text-neutral-500 flex flex-col gap-1">
        <span className="font-bold text-neutral-900">AIR-GAPPED NODE</span>
        <span>Zero outbound telemetry log</span>
      </div>
    </aside>
  );
}
