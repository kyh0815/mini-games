"use client";

import { useEffect, useRef } from "react";
import { audio } from "@/lib/audio";
import { cn } from "@/lib/utils";

const SEGMENTS = 20;

/** 칸칸이 꺼지는 LED 타이머. 3초 남으면 빨갛게 바뀌고 초읽기 소리가 납니다. */
export function LedTimer({
  now,
  deadline,
  totalMs,
  tick = true,
}: {
  now: number;
  deadline: number;
  totalMs: number;
  tick?: boolean;
}) {
  const left = Math.max(0, deadline - now);
  const seconds = Math.ceil(left / 1000);
  const lit = Math.ceil((left / totalMs) * SEGMENTS);
  const urgent = seconds <= 3;

  const lastTick = useRef(0);
  useEffect(() => {
    if (!tick || !urgent || seconds <= 0 || lastTick.current === seconds) return;
    lastTick.current = seconds;
    audio.play("tick");
  }, [tick, urgent, seconds]);

  return (
    <div
      role="timer"
      aria-label={`남은 시간 ${seconds}초`}
      className="flex items-center gap-3"
    >
      <div className="flex h-4 flex-1 gap-0.5 border-2 border-ink bg-ink p-0.5">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 transition-colors",
              i < lit ? (urgent ? "bg-neon-red" : "bg-game") : "bg-muted/60",
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "font-pixel min-w-9 text-right fs-2 tabular-nums",
          urgent ? "animate-blink text-neon-red" : "text-game",
        )}
      >
        {String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
