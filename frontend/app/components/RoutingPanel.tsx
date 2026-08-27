"use client";

import { Badge } from "@/components/ui/badge";
import type { RouteResult } from "@/lib/api";
import { GitBranch, Clock } from "lucide-react";

export default function RoutingPanel({ route }: { route: RouteResult }) {
  const formattedTime = route.timestamp
    ? new Date(route.timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <div className="w-full border border-slate-200/80 bg-white/80 backdrop-blur-xs px-4 py-3 font-sans text-xs rounded-xl shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <GitBranch className="h-4 w-4 text-blue-600" />
          <span className="text-slate-500 font-medium">Routed Task:</span>
          <span className="font-semibold font-mono text-slate-900">
            {route.model || "qwen2.5:1.5b-instruct"}
          </span>
          <Badge
            variant="outline"
            className="border-blue-200 text-blue-700 font-mono text-[10px] uppercase rounded-full bg-blue-50 px-2.5 py-0.5 font-medium"
          >
            {route.task_type || "GENERAL_TASK"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
          <Clock className="h-3 w-3" />
          <span>{formattedTime}</span>
        </div>
      </div>
    </div>
  );
}


