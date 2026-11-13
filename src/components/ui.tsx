import type { ButtonHTMLAttributes, ComponentProps, ReactNode, SelectHTMLAttributes } from "react";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-indigo-600 text-white hover:bg-indigo-500",
        variant === "ghost" &&
          "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-500",
        className,
      )}
    />
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cx(
        "h-11 w-full min-w-0 rounded-lg border border-zinc-300 bg-transparent px-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700",
        className,
      )}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "h-11 rounded-lg border border-zinc-300 bg-transparent px-3 text-base outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900",
        className,
      )}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

/** 남은 시간을 줄어드는 막대로 보여 줍니다. */
export function TimeBar({ now, deadline, totalMs }: { now: number; deadline: number; totalMs: number }) {
  const left = Math.max(0, deadline - now);
  const ratio = Math.min(1, left / totalMs);
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={cx("h-full rounded-full", ratio < 0.3 ? "bg-rose-500" : "bg-indigo-500")}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm tabular-nums text-zinc-500">
        {Math.ceil(left / 1000)}
      </span>
    </div>
  );
}

export { cx };
