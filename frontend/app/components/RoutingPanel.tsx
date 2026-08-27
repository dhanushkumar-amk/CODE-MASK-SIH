"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RouteResult } from "@/lib/api";

export default function RoutingPanel({ route }: { route: RouteResult }) {
  const formattedTime = route.timestamp
    ? new Date(route.timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <Card className="w-full border-blue-100/90 bg-white/90 p-4 sm:px-6 font-sans text-xs shadow-xs rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
            ROUTED TO <span className="text-blue-600">//</span>
          </span>
          <span className="font-bold font-mono text-slate-900 uppercase tracking-tight text-xs">
            {route.model || "qwen2.5:1.5b-instruct"}
          </span>
          <Badge
            variant="outline"
            className="border-blue-200 text-blue-700 font-mono text-[10px] uppercase tracking-wider rounded-full bg-blue-50/80 px-3 py-0.5 font-bold"
          >
            [{route.task_type || "GENERAL_TASK"}]
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse-live" />
          <span>TIMESTAMP: {formattedTime}</span>
        </div>
      </div>
    </Card>
  );
}

