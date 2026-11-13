import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// 오락실 버튼: 두꺼운 아래 그림자가 있고, 누르면 실제로 눌린 것처럼 내려갑니다.
const buttonVariants = cva(
  "group/button font-pixel relative inline-flex shrink-0 items-center justify-center gap-2 border-2 border-ink whitespace-nowrap outline-none select-none transition-[transform,box-shadow,filter,background-color,color] duration-75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 disabled:saturate-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground pixel-shadow hover:brightness-110 active:translate-y-1 active:shadow-none",
        game:
          "bg-game text-ink pixel-shadow hover:brightness-110 active:translate-y-1 active:shadow-none",
        coin:
          "bg-neon-yellow text-ink pixel-shadow hover:brightness-110 active:translate-y-1 active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground pixel-shadow hover:bg-accent active:translate-y-1 active:shadow-none",
        outline:
          "border-border bg-ink/60 text-foreground hover:border-game hover:text-game aria-expanded:border-game aria-expanded:text-game",
        ghost:
          "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive text-ink pixel-shadow hover:brightness-110 active:translate-y-1 active:shadow-none",
        link: "border-transparent font-sans text-game underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 fs-15",
        sm: "h-9 px-3 fs-1",
        lg: "h-14 px-7 fs-2",
        icon: "size-11",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
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
