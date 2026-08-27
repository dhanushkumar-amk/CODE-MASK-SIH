import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-xl border border-[#26272D] bg-[#121318] px-4 py-3 font-mono text-xs text-white transition-all duration-200 outline-none placeholder:text-[#525660] focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:bg-[#181920] disabled:opacity-50 shadow-2xs",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
