"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Label11, Screen } from "@/components/arcade/panel";
import { CHARACTERS, Sprite } from "@/components/arcade/sprites";
import { Countdown } from "@/components/arcade/timer";
import { ArrowLeft, ArrowRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { audio } from "@/lib/audio";
import { post } from "@/lib/client";
import { useNow } from "@/lib/clock";
import { useT } from "@/lib/i18n";
import { STEP_GAIN, drainPerMs, stageOf } from "@/lib/stairs";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { GameProps } from "./shared";
import { SoloIntro, SoloResult, SoloShell } from "./solo";

type View = Extract<RoomView, { game: "stairs" }>;

const BOARD = "stairs-2";
const STEP_W = 52;
const STEP_H = 30;

// 고른 캐릭터는 이 기기에 기억해 둡니다.
const CHARACTER_KEY = "mg_stairs_character";
const characterListeners = new Set<() => void>();
function readCharacter(): string {
  try {
    return localStorage.getItem(CHARACTER_KEY) ?? "me";
  } catch {
    return "me";
  }
}
function saveCharacter(id: string): void {
  try {
    localStorage.setItem(CHARACTER_KEY, id);
  } catch {
    // 저장하지 못하면 이번 판에만 적용됩니다.
  }
  characterListeners.forEach((fn) => fn());
}
function useCharacter(): string {
  return useSyncExternalStore(
    (fn) => {
      characterListeners.add(fn);
      return () => {
        characterListeners.delete(fn);
      };
    },
    readCharacter,
    () => "me",
  );
}

function CharacterPicker({ seed }: { seed: string }) {
  const t = useT();
  const character = useCharacter();
  const options = [{ id: "me", name: "내 아바타" }, ...CHARACTERS];
  return (
    <div className="flex flex-col gap-3">
      <span id="stairs-character" className="text-sm text-muted-foreground">
        {t("캐릭터")}
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-labelledby="stairs-character"
        value={character}
        onValueChange={(next) => next && saveCharacter(next)}
        className="flex-wrap justify-start"
      >
        {options.map((c) => (
          <Tooltip key={c.id}>
            <TooltipTrigger asChild>
              <ToggleGroupItem value={c.id} aria-label={t(c.name)} className="size-12 p-0">
                <Sprite id={c.id} seed={seed} className="size-8" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>{t(c.name)}</TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </div>
  );
}

function Climb({ view, send }: Pick<GameProps<View>, "view" | "send">) {
  const s = view.state;
  const t = useT();
  const now = useNow();
  const character = useCharacter();
  const started = now >= s.startAt;
  const [climbed, setClimbed] = useState(0);
  const [out, setOut] = useState(false);
  const [facing, setFacing] = useState<"L" | "R">("R");
  const state = useRef({ climbed: 0, out: false, sent: 0, energy: 1 });
  const bar = useRef<HTMLDivElement>(null);
  const stage = stageOf(climbed);

  const fall = useCallback(() => {
    const st = state.current;
    if (st.out) return;
    st.out = true;
    setOut(true);
    void send({ type: "out", climbed: st.climbed });
  }, [send]);

  const step = useCallback(
    (dir: "L" | "R") => {
      const st = state.current;
      if (!started || st.out) return;
      setFacing(dir);
      if (s.steps[st.climbed] !== dir) {
        audio.play("wrong");
        fall();
        return;
      }
      const before = stageOf(st.climbed);
      st.climbed += 1;
      st.energy = Math.min(1, st.energy + STEP_GAIN);
      setClimbed(st.climbed);
      audio.play(stageOf(st.climbed) > before ? "start" : "click");
    },
    [started, s.steps, fall],
  );

  // 체력은 쉬지 않고 줄어듭니다. 화면을 매번 다시 그리지 않도록 막대만 직접 움직입니다.
  useEffect(() => {
    if (!started) return;
    let frame = 0;
    let last = performance.now();
    const loop = (at: number) => {
      const st = state.current;
      if (st.out) return;
      st.energy -= drainPerMs(st.climbed) * (at - last);
      last = at;
      if (bar.current) {
        bar.current.style.transform = `scaleX(${Math.max(0, st.energy)})`;
        bar.current.dataset.low = st.energy < 0.3 ? "true" : "false";
      }
      if (st.energy <= 0) {
        audio.play("wrong");
        fall();
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const report = setInterval(() => {
      const st = state.current;
      if (st.out || st.sent === st.climbed) return;
      st.sent = st.climbed;
      void post(`/api/rooms/${view.code}/action`, {
        action: { type: "progress", climbed: st.climbed },
      }).catch(() => {});
    }, 500);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(report);
    };
  }, [started, fall, view.code]);

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
            <span className="font-pixel fs-2 text-foreground tabular-nums">{climbed}</span>
            {t("계단")}
          </span>
          <span key={stage} className={cn("flex items-center gap-2", stage > 1 && "animate-pop")}>
            <Label11 className="text-game tabular-nums">LV {stage}</Label11>
            <Label11>{out ? "FALL" : "CLIMB"}</Label11>
          </span>
        </div>
        {/* 체력 막대: 계속 줄어들고, 한 계단 오를 때마다 조금 찹니다. */}
        <div className="h-3 bg-muted">
          <div
            ref={bar}
            className={cn(
              "h-full origin-left bg-game data-[low=true]:bg-pop-red",
              (!started || out) && "invisible",
            )}
          />
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
              <Sprite
                id={character}
                seed={view.you}
                className={cn("size-9", facing === "L" && "-scale-x-100")}
              />
            </div>
          )}
          {started && !out && stage > 1 && climbed % 30 < 4 && (
            <p
              key={stage}
              className="font-pixel absolute inset-x-0 top-3 animate-pop text-center fs-15 text-game"
            >
              LEVEL UP
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" disabled={!started || out} onPointerDown={() => step("L")}>
            <ArrowLeft /> {t("왼쪽")}
          </Button>
          <Button variant="secondary" size="lg" disabled={!started || out} onPointerDown={() => step("R")}>
            {t("오른쪽")} <ArrowRight />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {t("키보드는 ← → 또는 A D. 다음 계단이 놓인 쪽을 누르세요.")}
        </p>
      </div>
    </Screen>
  );
}

export function Stairs({ view, send }: GameProps<View>) {
  const s = view.state;
  const t = useT();
  if (s.phase === "lobby") {
    return (
      <SoloShell view={view} boardKey={BOARD}>
        <SoloIntro view={view} onStart={() => send({ type: "start" })}>
          <CharacterPicker seed={view.you} />
        </SoloIntro>
      </SoloShell>
    );
  }
  if (s.phase === "result") {
    return (
      <SoloShell view={view} boardKey={BOARD}>
        <SoloResult
          last={s.last}
          detail={t("{n}단계까지 올랐습니다.", { n: stageOf(s.climbed) })}
          onRetry={() => send({ type: "start" })}
          onBack={() => send({ type: "reset" })}
        />
      </SoloShell>
    );
  }
  return (
    <SoloShell view={view} boardKey={BOARD}>
      <Climb key={s.startAt} view={view} send={send} />
    </SoloShell>
  );
}
