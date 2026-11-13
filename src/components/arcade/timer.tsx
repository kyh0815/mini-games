"use client";

import { useEffect, useRef } from "react";
import { audio } from "@/lib/audio";
import { useNow } from "@/lib/clock";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SEGMENTS = 20;

/** 칸칸이 줄어드는 타이머. 3초 남으면 빨갛게 바뀌고 초읽기 소리가 납니다. */
export function LedTimer({
  deadline,
  totalMs,
  tick = true,
}: {
  deadline: number;
  totalMs: number;
  tick?: boolean;
}) {
  const t = useT();
  const now = useNow();
  const left = Math.max(0, deadline - now);
  const seconds = Math.ceil(left / 1000);
  const lit = Math.min(SEGMENTS, Math.ceil((left / totalMs) * SEGMENTS));
  const urgent = seconds <= 3;

  const lastTick = useRef(0);
  useEffect(() => {
    if (!tick || !urgent || seconds <= 0 || lastTick.current === seconds) return;
    lastTick.current = seconds;
    audio.play("tick");
  }, [tick, urgent, seconds]);

  return (
    <div role="timer" aria-label={t("남은 시간 {n}초", { n: seconds })} className="flex items-center gap-3">
      <div className="flex h-3 flex-1 gap-px">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={cn("flex-1", i < lit ? (urgent ? "bg-pop-red" : "bg-game") : "bg-muted")}
          />
        ))}
      </div>
      <span
        className={cn(
          "font-pixel min-w-9 text-right fs-2 tabular-nums",
          urgent ? "text-pop-red" : "text-foreground",
        )}
      >
        {String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}

/** 시작 전 카운트다운 숫자 */
export function Countdown({ until }: { until: number }) {
  const now = useNow();
  const seconds = Math.max(1, Math.ceil((until - now) / 1000));
  const last = useRef(0);
  useEffect(() => {
    if (last.current === seconds) return;
    last.current = seconds;
    audio.play("tick");
  }, [seconds]);
  return (
    <span key={seconds} className="font-pixel animate-pop fs-6 text-game tabular-nums">
      {seconds}
    </span>
  );
}
