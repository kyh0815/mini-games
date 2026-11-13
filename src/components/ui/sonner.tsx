"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Check, InfoBox, WarningDiamond } from "@/components/icons"

// 알림은 화면 위쪽 가운데에 오락실 안내판처럼 뜹니다.
const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="dark"
    position="top-center"
    icons={{
      success: <Check className="size-5 text-neon-green" />,
      info: <InfoBox className="size-5 text-neon-cyan" />,
      warning: <WarningDiamond className="size-5 text-neon-yellow" />,
      error: <WarningDiamond className="size-5 text-neon-red" />,
    }}
    toastOptions={{
      unstyled: true,
      classNames: {
        toast:
          "flex w-full items-center gap-3 border-2 border-border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-[4px_4px_0_0_var(--ink)]",
        error: "border-neon-red!",
        success: "border-neon-green!",
        title: "font-medium",
        description: "text-muted-foreground",
      },
    }}
    {...props}
  />
)

export { Toaster }
