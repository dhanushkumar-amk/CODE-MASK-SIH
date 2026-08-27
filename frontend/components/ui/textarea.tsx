import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-none border border-neutral-300 bg-white px-3 py-2.5 font-mono text-xs text-neutral-950 transition-colors outline-none placeholder:text-neutral-400 focus-visible:border-neutral-950 focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
