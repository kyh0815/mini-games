import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 border-2 border-input bg-ink/70 px-3 text-base text-foreground caret-game transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-game focus-visible:shadow-[0_0_0_1px_var(--game),0_0_16px_color-mix(in_oklch,var(--game)_45%,transparent)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
