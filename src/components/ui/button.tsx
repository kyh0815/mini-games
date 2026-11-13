import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// 단단한 그림자가 있고, 누르면 그림자만큼 내려가는 버튼입니다.
const PRESS = "pixel-shadow active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 border-2 border-ink text-sm font-semibold whitespace-nowrap outline-none select-none transition-[transform,box-shadow,background-color,color,border-color] duration-75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),white_12%)] ${PRESS}`,
        game: `bg-game text-ink hover:bg-[color-mix(in_oklch,var(--game),white_12%)] ${PRESS}`,
        secondary: `bg-secondary text-secondary-foreground hover:bg-accent ${PRESS}`,
        outline:
          "border-border bg-transparent text-foreground hover:border-foreground/60 hover:bg-muted/60 aria-expanded:border-foreground/60 aria-expanded:bg-muted/60",
        ghost:
          "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive: `bg-destructive text-ink hover:bg-[color-mix(in_oklch,var(--destructive),white_12%)] ${PRESS}`,
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-4",
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
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
