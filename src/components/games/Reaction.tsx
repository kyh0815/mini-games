"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Label11, Screen } from "@/components/arcade/panel";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { GameProps } from "./shared";
import { SoloIntro, SoloResult, SoloShell } from "./solo";

type View = Extract<RoomView, { game: "reaction" }>;

export function Reaction({ view, send }: GameProps<View>) {
  const s = view.state;
  // 반응 시간은 초록 화면이 그려진 순간부터 이 기기에서 잽니다. 통신 지연이 섞이지 않습니다.
  const shownAt = useRef(0);
  useLayoutEffect(() => {
    if (s.phase === "go") shownAt.current = performance.now();
  }, [s.phase, s.round]);

  const active = s.phase === "wait" || s.phase === "go";
  const tap = useCallback(() => {
    if (s.phase === "go") send({ type: "tap", ms: Math.round(performance.now() - shownAt.current) });
    else if (s.phase === "wait") send({ type: "tap" });
  }, [s.phase, send]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      tap();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, tap]);

  if (s.phase === "lobby") {
    return (
      <SoloShell view={view} boardKey="reaction">
        <SoloIntro view={view} onStart={() => send({ type: "start" })} />
      </SoloShell>
    );
  }
  if (s.phase === "result") {
    return (
      <SoloShell view={view} boardKey="reaction">
        <SoloResult
          last={s.last}
          detail={`${s.times.join(" · ")} ms`}
          onRetry={() => send({ type: "start" })}
          onBack={() => send({ type: "reset" })}
        />
      </SoloShell>
    );
  }

  const last = s.times[s.times.length - 1];
  return (
    <SoloShell view={view} boardKey="reaction">
      <Screen>
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <Label11 className="tabular-nums">
              ROUND {Math.min(s.round, s.rounds)}/{s.rounds}
            </Label11>
            <ol className="flex gap-2 text-sm text-muted-foreground tabular-nums">
              {s.times.map((ms, i) => (
                <li key={i}>{ms}</li>
              ))}
            </ol>
          </div>
          {/* 누르는 순간을 재야 하므로 click이 아니라 pointerdown을 씁니다. */}
          <button
            type="button"
            onPointerDown={tap}
            className={cn(
              "flex h-72 w-full select-none flex-col items-center justify-center gap-3 border-2 border-ink outline-none sm:h-80",
              s.phase === "wait" && "bg-pop-red/30",
              s.phase === "go" && "bg-pop-green text-ink",
              s.phase === "early" && "bg-muted",
              s.phase === "between" && "bg-card",
            )}
          >
            {s.phase === "wait" && (
              <>
                <span className="font-pixel fs-3">기다리세요</span>
                <span className="text-sm text-muted-foreground">초록으로 바뀌면 누르세요</span>
              </>
            )}
            {s.phase === "go" && <span className="font-pixel fs-6">지금!</span>}
            {s.phase === "early" && (
              <>
                <span className="font-pixel fs-3 text-pop-red">너무 빨랐습니다</span>
                <span className="text-sm text-muted-foreground">이번 회차를 다시 합니다</span>
              </>
            )}
            {s.phase === "between" && (
              <span key={s.times.length} className="font-pixel animate-pop fs-6 tabular-nums">
                {last}
                <span className="ml-1 fs-2 text-muted-foreground">ms</span>
              </span>
            )}
          </button>
          <p className="text-center text-xs text-muted-foreground">클릭하거나 스페이스를 누르세요.</p>
        </div>
      </Screen>
    </SoloShell>
  );
}
