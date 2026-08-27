"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RouteResult } from "@/lib/api";

export default function RoutingPanel({ route }: { route: RouteResult }) {
  const formattedTime = route.timestamp
    ? new Date(route.timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <Card className="w-full border-[#26272D] bg-[#14151A] p-4 sm:px-6 font-mono text-xs shadow-xl shadow-black/40 rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[#8A8F98] font-semibold uppercase tracking-wider text-[11px]">
            ROUTED TO:
          </span>
          <span className="font-bold text-white uppercase tracking-tight text-xs">
            {route.model || "qwen2.5:1.5b-instruct"}
          </span>
          <Badge
            variant="outline"
            className="border-[#2E303A] text-white font-mono text-[10px] uppercase tracking-wider rounded-full bg-[#181920] px-3 py-0.5"
          >
            [{route.task_type || "GENERAL_TASK"}]
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[#8A8F98] text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span>TIMESTAMP: {formattedTime}</span>
        </div>
      </div>
    </Card>
  );
}
