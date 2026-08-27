import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent font-mono text-xs font-semibold uppercase tracking-wider transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-neutral-950 text-white hover:bg-neutral-800 border-neutral-950",
        outline:
          "border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-100",
        secondary:
          "bg-neutral-100 text-neutral-950 hover:bg-neutral-200 border-neutral-200",
        ghost:
          "hover:bg-neutral-100 text-neutral-950 border-transparent",
        destructive:
          "bg-neutral-950 text-white hover:bg-neutral-900 border-neutral-950",
        link: "text-neutral-950 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 gap-2",
        xs: "h-6 px-2 text-[10px] gap-1",
        sm: "h-8 px-3 text-xs gap-1.5",
        lg: "h-11 px-6 text-xs gap-2",
        icon: "size-9",
        "icon-xs": "size-6",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
