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
    <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[#1F2026] bg-[#0C0D0E] font-mono text-xs text-[#F7F8F8] flex flex-col justify-between">
      <div className="flex flex-col p-4 sm:p-5 gap-6">
        {/* Logo & System Badge */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold tracking-tight text-white text-sm uppercase flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
              SOVEREIGN
            </span>
            <Badge variant="outline" className="text-[9px] border-[#2A2C34] bg-[#14151A] text-[#8A8F98]">
              v1.0
            </Badge>
          </div>
          <span className="text-[10px] text-[#8A8F98] uppercase tracking-widest font-semibold">
            WORKBENCH // CONSOLE
          </span>
        </div>

        {/* Network Status Badge (Always Visible) */}
        <div className="flex flex-col gap-1.5 border-y border-[#1F2026] py-3.5">
          <span className="text-[10px] uppercase tracking-widest text-[#8A8F98] font-semibold">
            TELEMETRY MONITOR
          </span>
          <NetworkStatusBadge className="w-full justify-center" />
        </div>

        {/* System Environment Info */}
        <div className="flex flex-col gap-2.5 border-b border-[#1F2026] pb-4 text-[11px]">
          <div className="flex justify-between items-center text-[#8A8F98]">
            <span className="uppercase text-[#70757E]">MODEL:</span>
            <span className="font-bold text-white">qwen2.5:1.5b</span>
          </div>
          <div className="flex justify-between items-center text-[#8A8F98]">
            <span className="uppercase text-[#70757E]">ENCLAVE:</span>
            <span className="font-bold text-white">docker --none</span>
          </div>
          <div className="flex justify-between items-center text-[#8A8F98]">
            <span className="uppercase text-[#70757E]">HOST:</span>
            <span className="font-bold text-white">127.0.0.1</span>
          </div>
        </div>

        {/* Operator Console Navigation */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[#8A8F98] font-semibold mb-1">
            OPERATOR NAVIGATION
          </span>
          <Button
            variant={activeTab === "new-task" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              onSelectTab?.("new-task");
              onResetTask?.();
            }}
            className={`w-full justify-start font-mono text-xs uppercase cursor-pointer ${
              activeTab === "new-task" ? "bg-white text-black font-bold" : "bg-[#14151A] text-white border-[#26272D]"
            }`}
          >
            + NEW TASK CONSOLE
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectTab?.("history")}
            className={`w-full justify-between font-mono text-xs uppercase cursor-pointer ${
              activeTab === "history" ? "bg-white text-black font-bold" : "bg-[#14151A] text-white border-[#26272D]"
            }`}
          >
            <span>TASK HISTORY</span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 border-[#2A2C34] bg-[#1E1F26] text-[#8A8F98]">
              STUB
            </Badge>
          </Button>
        </div>
      </div>

      {/* Footer info inside sidebar */}
      <div className="p-4 border-t border-[#1F2026] text-[10px] text-[#70757E] flex flex-col gap-1 bg-[#08090A]">
        <span className="font-bold text-slate-300 uppercase">AIR-GAPPED ENCLAVE NODE</span>
        <span>0 outbound telemetry transmission log</span>
      </div>
    </aside>
  );
}
