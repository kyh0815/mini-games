"use client";

import { useEffect, useRef, useState } from "react";
import { Label11, Panel, Screen } from "@/components/arcade/panel";
import { Countdown } from "@/components/arcade/timer";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Skull } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { post } from "@/lib/client";
import { useNow } from "@/lib/clock";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Lobby, Option, RankRow, Result, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "snake" }>;
type Dir = "U" | "D" | "L" | "R";

const CELL = 20;
const COLORS = ["#7ccf9a", "#e98fa5", "#7fb4e6", "#e9c46a", "#b79be0", "#e8a05c", "#6fcbc4", "#e06c5f"];
const KEYS: Record<string, Dir> = {
  ArrowUp: "U", KeyW: "U", ArrowDown: "D", KeyS: "D",
  ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R",
};

function Board({ view }: { view: View }) {
  const s = view.state;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const w = s.width * CELL;
    const h = s.height * CELL;
    if (canvas.width !== w * scale) {
      canvas.width = w * scale;
      canvas.height = h * scale;
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#14151a";
    ctx.fillRect(0, 0, w, h);
    // 옅은 모눈
    ctx.fillStyle = "#1f2128";
    for (let x = 0; x < s.width; x++) {
      for (let y = 0; y < s.height; y++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
    ctx.fillStyle = "#f3efe4";
    for (let i = 0; i < s.foods.length; i += 2) {
      ctx.fillRect(s.foods[i] * CELL + 6, s.foods[i + 1] * CELL + 6, CELL - 12, CELL - 12);
    }
    s.snakes.forEach((snake, index) => {
      if (!snake.alive) return;
      const color = COLORS[index % COLORS.length];
      for (let i = snake.body.length - 2; i >= 0; i -= 2) {
        const x = snake.body[i] * CELL;
        const y = snake.body[i + 1] * CELL;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        if (i === 0) {
          // 머리: 내 뱀은 흰 테두리로 구분합니다.
          ctx.fillStyle = "#14151a";
          ctx.fillRect(x + 6, y + 6, CELL - 12, CELL - 12);
          if (snake.id === view.you) {
            ctx.strokeStyle = "#f3efe4";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
          }
        }
      }
    });
  }, [s, view.you]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="게임판"
      className="block w-full touch-none border-2 border-ink"
      style={{ aspectRatio: `${s.width} / ${s.height}`, imageRendering: "pixelated" }}
    />
  );
}

function Starting({ startAt }: { startAt: number }) {
  const now = useNow();
  if (now >= startAt) return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-inset/80">
      <Label11>GET READY</Label11>
      <Countdown until={startAt} />
    </div>
  );
}

export function Snake({ view, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const [speed, setSpeed] = useState("normal");
  const playing = s.phase === "play";
  const lastDir = useRef<Dir | null>(null);

  const turn = (dir: Dir) => {
    if (lastDir.current === dir) return;
    lastDir.current = dir;
    void post(`/api/rooms/${view.code}/action`, { action: { type: "turn", dir } }).catch(() => {});
  };

  useEffect(() => {
    if (!playing) return;
    lastDir.current = null;
    const onKey = (e: KeyboardEvent) => {
      const dir = KEYS[e.code];
      if (!dir) return;
      e.preventDefault();
      if (lastDir.current === dir) return;
      lastDir.current = dir;
      void post(`/api/rooms/${view.code}/action`, { action: { type: "turn", dir } }).catch(() => {});
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, view.code]);

  if (s.phase === "lobby") {
    return (
      <Lobby view={view} send={send} onStart={() => send({ type: "start", speed })}>
        <Option label="속도">
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label="속도"
            value={speed}
            onValueChange={(v) => v && setSpeed(v)}
          >
            <ToggleGroupItem value="slow">느리게</ToggleGroupItem>
            <ToggleGroupItem value="normal">보통</ToggleGroupItem>
            <ToggleGroupItem value="fast">빠르게</ToggleGroupItem>
          </ToggleGroup>
        </Option>
      </Lobby>
    );
  }

  const ranked = s.snakes
    .map((snake, index) => ({ ...snake, color: COLORS[index % COLORS.length] }))
    .sort((a, b) => Number(b.alive) - Number(a.alive) || b.score - a.score);

  if (s.phase === "result") {
    const iPlayed = s.snakes.some((x) => x.id === view.you);
    const solo = s.snakes.length === 1;
    return (
      <Result
        view={view}
        send={send}
        tone={solo || !iPlayed || !s.winnerId ? "neutral" : s.winnerId === view.you ? "win" : "lose"}
        title={solo ? `${s.snakes[0].score}점` : s.winnerId ? `${nameOf(s.winnerId)} 승리` : "무승부"}
      >
        <ol className="flex flex-col gap-2">
          {ranked.map((snake, i) => (
            <RankRow key={snake.id} rank={i + 1} id={snake.id} name={nameOf(snake.id)} you={snake.id === view.you}>
              <span className="font-pixel fs-15 tabular-nums">{snake.score}</span>
            </RankRow>
          ))}
        </ol>
      </Result>
    );
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <Screen>
        <div className="flex flex-col gap-3 p-3 sm:p-4">
          <div className="relative">
            <Board view={view} />
            <Starting startAt={s.startAt} />
          </div>
          {/* 터치 화면용 방향 버튼 */}
          <div className="grid grid-cols-3 gap-2 lg:hidden" aria-label="방향">
            <span />
            <Button variant="secondary" size="lg" aria-label="위" onPointerDown={() => turn("U")}>
              <ArrowUp />
            </Button>
            <span />
            <Button variant="secondary" size="lg" aria-label="왼쪽" onPointerDown={() => turn("L")}>
              <ArrowLeft />
            </Button>
            <Button variant="secondary" size="lg" aria-label="아래" onPointerDown={() => turn("D")}>
              <ArrowDown />
            </Button>
            <Button variant="secondary" size="lg" aria-label="오른쪽" onPointerDown={() => turn("R")}>
              <ArrowRight />
            </Button>
          </div>
          <p className="hidden text-center text-xs text-muted-foreground lg:block">
            방향키 또는 WASD로 움직입니다. 흰 테두리가 내 뱀입니다.
          </p>
        </div>
      </Screen>
      <Panel label="SCORE">
        <ol className="flex flex-col gap-1.5 p-3">
          {ranked.map((snake) => (
            <li
              key={snake.id}
              className={cn("flex h-9 items-center gap-2.5 px-1 text-sm", !snake.alive && "opacity-45")}
            >
              <span className="size-4 border-2 border-ink" style={{ backgroundColor: snake.color }} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {nameOf(snake.id)}
                {snake.id === view.you && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">나</span>
                )}
              </span>
              {!snake.alive && <Skull aria-label="탈락" className="size-4 text-muted-foreground" />}
              <span className="font-pixel fs-15 tabular-nums">{snake.score}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
