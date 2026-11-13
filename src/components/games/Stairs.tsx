"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Label11, Screen } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { Countdown } from "@/components/arcade/timer";
import { ArrowLeft, ArrowRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { audio } from "@/lib/audio";
import { post } from "@/lib/client";
import { useNow } from "@/lib/clock";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { GameProps } from "./shared";
import { SoloIntro, SoloResult, SoloShell } from "./solo";

type View = Extract<RoomView, { game: "stairs" }>;

/** 한 계단을 오를 때 주어지는 시간. 높이 오를수록 짧아집니다. */
const windowMs = (climbed: number) => Math.max(650, 2_600 - climbed * 13);
const STEP_W = 52;
const STEP_H = 30;

function Climb({ view, send }: Pick<GameProps<View>, "view" | "send">) {
  const s = view.state;
  const now = useNow();
  const started = now >= s.startAt;
  const [climbed, setClimbed] = useState(0);
  const [out, setOut] = useState(false);
  const state = useRef({ climbed: 0, out: false, sent: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fall = useCallback(() => {
    const st = state.current;
    if (st.out) return;
    st.out = true;
    if (timer.current) clearTimeout(timer.current);
    setOut(true);
    void send({ type: "out", climbed: st.climbed });
  }, [send]);

  // 체력이 다 떨어지면 떨어집니다. 오를 때마다 다시 잽니다.
  const arm = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fall, windowMs(state.current.climbed));
  }, [fall]);

  const step = useCallback(
    (dir: "L" | "R") => {
      const st = state.current;
      if (!started || st.out) return;
      if (s.steps[st.climbed] !== dir) {
        audio.play("wrong");
        fall();
        return;
      }
      st.climbed += 1;
      setClimbed(st.climbed);
      audio.play("click");
      arm();
    },
    [started, s.steps, fall, arm],
  );

  useEffect(() => {
    if (!started) return;
    arm();
    const report = setInterval(() => {
      const st = state.current;
      if (st.out || st.sent === st.climbed) return;
      st.sent = st.climbed;
      void post(`/api/rooms/${view.code}/action`, {
        action: { type: "progress", climbed: st.climbed },
      }).catch(() => {});
    }, 500);
    return () => {
      clearInterval(report);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [started, arm, view.code]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") step("L");
      else if (e.code === "ArrowRight" || e.code === "KeyD") step("R");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  // 지금 서 있는 계단을 기준으로 앞뒤 몇 칸만 그립니다.
  const blocks: { k: number; x: number }[] = [];
  let x = 0;
  for (let k = climbed; k >= Math.max(0, climbed - 3); k--) {
    blocks.push({ k, x });
    if (k > 0) x -= s.steps[k - 1] === "R" ? 1 : -1;
  }
  x = 0;
  for (let k = climbed + 1; k <= climbed + 9 && k <= s.steps.length; k++) {
    x += s.steps[k - 1] === "R" ? 1 : -1;
    blocks.push({ k, x });
  }

  return (
    <Screen>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-end justify-between">
          <span className="flex items-baseline gap-1.5 text-sm text-muted-foreground">
            <span className="font-pixel fs-2 text-foreground tabular-nums">{climbed}</span>계단
          </span>
          <Label11>{out ? "FALL" : "CLIMB"}</Label11>
        </div>
        {/* 체력 막대: 계단을 오를 때마다 처음부터 다시 줄어듭니다. */}
        <div className="h-3 bg-muted">
          {started && !out && (
            <div
              key={climbed}
              className="h-full origin-left bg-game"
              style={{ animation: `drain ${windowMs(climbed)}ms linear forwards` }}
            />
          )}
        </div>
        <div className="relative h-80 overflow-hidden border-2 border-ink bg-card">
          {!started ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Label11>GET READY</Label11>
              <Countdown until={s.startAt} />
            </div>
          ) : (
            blocks.map(({ k, x: bx }) => (
              <div
                key={k}
                className={cn(
                  "absolute h-3 border-2 border-ink transition-transform duration-100",
                  k === climbed ? "bg-game" : k < climbed ? "bg-muted" : "bg-secondary",
                )}
                style={{
                  width: STEP_W,
                  left: `calc(50% - ${STEP_W / 2}px)`,
                  bottom: 56,
                  transform: `translate(${bx * STEP_W}px, ${-(k - climbed) * STEP_H}px)`,
                }}
              />
            ))
          )}
          {started && (
            <div
              className={cn(
                "absolute bottom-[68px] left-1/2 -translate-x-1/2 transition-transform duration-300",
                out && "translate-y-40 rotate-90",
              )}
            >
              <PixelAvatar seed={view.you} className="size-8" />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" disabled={!started || out} onPointerDown={() => step("L")} aria-label="왼쪽">
            <ArrowLeft /> 왼쪽
          </Button>
          <Button variant="secondary" size="lg" disabled={!started || out} onPointerDown={() => step("R")} aria-label="오른쪽">
            오른쪽 <ArrowRight />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          키보드는 ← → 또는 A D. 다음 계단이 놓인 쪽을 누르세요.
        </p>
      </div>
    </Screen>
  );
}

export function Stairs({ view, send }: GameProps<View>) {
  const s = view.state;
  if (s.phase === "lobby") {
    return (
      <SoloShell view={view} boardKey="stairs">
        <SoloIntro view={view} onStart={() => send({ type: "start" })} />
      </SoloShell>
    );
  }
  if (s.phase === "result") {
    return (
      <SoloShell view={view} boardKey="stairs">
        <SoloResult
          last={s.last}
          onRetry={() => send({ type: "start" })}
          onBack={() => send({ type: "reset" })}
        />
      </SoloShell>
    );
  }
  return (
    <SoloShell view={view} boardKey="stairs">
      <Climb key={s.startAt} view={view} send={send} />
    </SoloShell>
  );
}
