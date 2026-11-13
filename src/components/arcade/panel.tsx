import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 오락기 몸체 같은 패널. 제목 띠(label)를 달 수 있습니다. */
export function Panel({
  label,
  action,
  className,
  children,
  ...props
}: ComponentProps<"section"> & { label?: ReactNode; action?: ReactNode }) {
  return (
    <section
      {...props}
      className={cn(
        "border-2 border-border bg-card/90 shadow-[6px_6px_0_0_var(--ink)] backdrop-blur-sm",
        className,
      )}
    >
      {(label || action) && (
        <header className="flex min-h-10 items-center justify-between gap-3 border-b-2 border-border bg-ink/50 px-4">
          <h2 className="font-pixel fs-1 text-game">{label}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** 브라운관 화면. 게임이 실제로 진행되는 영역입니다. */
export function Screen({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn("crt neon-box border-2 border-ink [--glow:var(--game)]", className)}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** 전구가 번갈아 깜빡이는 간판 테두리 */
export function Bulbs({ count = 14, className }: { count?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("flex justify-between", className)}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="size-1.5 animate-chase rounded-full bg-neon-yellow shadow-[0_0_6px_var(--neon-yellow)]"
          style={{ animationDelay: `${(i % 2) * 0.6}s` }}
        />
      ))}
    </div>
  );
}

/** 깜빡이는 안내 문구 (INSERT COIN 같은) */
export function Blink({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("font-pixel animate-blink", className)}>{children}</span>;
}
