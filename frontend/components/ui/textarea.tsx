import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs text-slate-950 transition-all duration-200 outline-none placeholder:text-slate-400 focus-visible:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-50 shadow-2xs",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
