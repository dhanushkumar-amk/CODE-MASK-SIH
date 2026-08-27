import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all select-none [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-white text-black border-white shadow-2xs",
        secondary: "bg-[#1E1F26] text-[#E2E8F0] border-[#2A2C36]",
        destructive: "bg-red-950/80 text-red-400 border-red-800/80",
        outline: "border-[#2E303A] text-white bg-[#14151A] shadow-2xs",
        ghost: "hover:bg-[#1E1F26] text-[#8A8F98] border-transparent",
        link: "text-white underline-offset-4 hover:underline border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
