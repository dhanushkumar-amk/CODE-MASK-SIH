import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl font-sans text-xs font-semibold tracking-wide transition-all duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-slate-950/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-slate-950 text-white hover:bg-slate-800 shadow-xs border border-slate-950 hover:shadow-md",
        outline:
          "border border-slate-200 bg-white text-slate-950 hover:bg-slate-50 hover:border-slate-300 shadow-2xs",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200/80",
        ghost:
          "hover:bg-slate-100 text-slate-700 hover:text-slate-950 border border-transparent",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 shadow-xs",
        link:
          "text-slate-950 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 gap-2 text-xs",
        xs: "h-6 px-2 text-[10px] rounded-lg gap-1",
        sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
        lg: "h-11 px-6 text-sm rounded-xl gap-2",
        icon: "size-9 rounded-xl",
        "icon-xs": "size-6 rounded-lg",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

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
  );
}

export { Button, buttonVariants };
