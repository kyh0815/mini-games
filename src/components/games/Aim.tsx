"use client";

import { useEffect, useRef, useState } from "react";
import { Label11, Screen } from "@/components/arcade/panel";
import { Countdown, LedTimer } from "@/components/arcade/timer";
import { audio } from "@/lib/audio";
import { post } from "@/lib/client";
import { useNow } from "@/lib/clock";
import type { RoomView } from "@/lib/types";
import type { GameProps } from "./shared";
import { SoloIntro, SoloResult, SoloShell } from "./solo";

type View = Extract<RoomView, { game: "aim" }>;

const PLAY_MS = 30_000;

function Range({ view }: { view: View }) {
  const s = view.state;
  const now = useNow();
  const [score, setScore] = useState({ hits: 0, misses: 0 });
  const latest = useRef({ hits: 0, misses: 0, sent: -1, final: false });
  const started = now >= s.startAt;
  const over = now >= s.deadline;
  const playing = started && !over;

  useEffect(() => {
    latest.current.hits = score.hits;
    latest.current.misses = score.misses;
  }, [score]);

  // 점수는 일정 간격으로 묶어 보내고, 끝나는 순간 마지막 값을 한 번 더 보냅니다.
  useEffect(() => {
    if (!started) return;
    const report = (final: boolean) => {
      const l = latest.current;
      if (l.final) return;
      const total = l.hits + l.misses;
      if (!final && total === l.sent) return;
      l.sent = total;
      l.final = final;
      void post(`/api/rooms/${view.code}/action`, {
        action: { type: "progress", hits: l.hits, misses: l.misses, final },
      }).catch(() => {});
    };
    if (over) {
      report(true);
      return;
    }
    const id = setInterval(() => report(false), 300);
    return () => clearInterval(id);
  }, [started, over, view.code]);

  const x = s.targets[score.hits * 2] ?? 500;
  const y = s.targets[score.hits * 2 + 1] ?? 500;
  const shots = score.hits + score.misses;

  return (
    <Screen>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-end justify-between">
          <span className="flex items-baseline gap-1.5 text-sm text-muted-foreground">
            <span className="font-pixel fs-2 text-foreground tabular-nums">{score.hits}</span>점
          </span>
          <Label11 className="tabular-nums">
            ACC {shots > 0 ? Math.round((score.hits / shots) * 100) : 100}%
          </Label11>
        </div>
        <div
          onPointerDown={() => {
            if (!playing) return;
            setScore((v) => ({ ...v, misses: v.misses + 1 }));
          }}
          className="relative aspect-[16/10] w-full touch-none overflow-hidden border-2 border-ink bg-card select-none"
          style={{ cursor: playing ? "crosshair" : "default" }}
        >
          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Label11>GET READY</Label11>
              <Countdown until={s.startAt} />
            </div>
          )}
          {playing && (
            <button
              type="button"
              aria-label="표적"
              onPointerDown={(e) => {
                e.stopPropagation();
                audio.play("blip");
                setScore((v) => ({ ...v, hits: v.hits + 1 }));
              }}
              className="absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-game outline-none sm:size-14"
              style={{ left: `${x / 10}%`, top: `${y / 10}%`, cursor: "crosshair" }}
            >
              <span className="absolute inset-[30%] rounded-full bg-ink" />
            </button>
          )}
          {over && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              기록을 올리는 중…
            </div>
          )}
        </div>
        {started ? (
          <LedTimer deadline={s.deadline} totalMs={PLAY_MS} />
        ) : (
          <p className="text-center text-xs text-muted-foreground">표적이 나타나면 최대한 빨리 누르세요.</p>
        )}
      </div>
    </Screen>
  );
}

export function Aim({ view, send }: GameProps<View>) {
  const s = view.state;
  if (s.phase === "lobby") {
    return (
      <SoloShell view={view} boardKey="aim">
        <SoloIntro view={view} onStart={() => send({ type: "start" })} />
      </SoloShell>
    );
  }
  if (s.phase === "result") {
    const shots = s.hits + s.misses;
    return (
      <SoloShell view={view} boardKey="aim">
        <SoloResult
          last={s.last}
          detail={`명중률 ${shots > 0 ? Math.round((s.hits / shots) * 100) : 0}% · 빗나감 ${s.misses}번`}
          onRetry={() => send({ type: "start" })}
          onBack={() => send({ type: "reset" })}
        />
      </SoloShell>
    );
  }
  return (
    <SoloShell view={view} boardKey="aim">
      <Range key={s.startAt} view={view} />
    </SoloShell>
  );
}
