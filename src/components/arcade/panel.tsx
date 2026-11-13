import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 제목 띠를 달 수 있는 기본 패널 */
export function Panel({
  label,
  action,
  className,
  children,
  ...props
}: ComponentProps<"section"> & { label?: ReactNode; action?: ReactNode }) {
  return (
    <section {...props} className={cn("border-2 border-ink bg-card pixel-shadow", className)}>
      {(label || action) && (
        <header className="flex min-h-10 items-center justify-between gap-3 border-b-2 border-ink px-4">
          <h2 className="font-pixel fs-1 tracking-wide text-muted-foreground">{label}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** 게임이 실제로 진행되는 화면 영역. 위쪽에 게임 대표색 줄이 들어갑니다. */
export function Screen({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("screen pixel-shadow", className)}>
      <div aria-hidden className="h-1 bg-game" />
      {children}
    </div>
  );
}

/** 깜빡이는 짧은 안내 문구. 기다리는 상태를 알릴 때만 씁니다. */
export function Blink({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("font-pixel animate-blink", className)}>{children}</span>;
}

/** 작은 픽셀 글씨 라벨 */
export function Label11({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("font-pixel fs-1 tracking-wide text-muted-foreground", className)}>
      {children}
    </span>
  );
}
