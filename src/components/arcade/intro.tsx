"use client";

import { useEffect, useRef, useState } from "react";
import { BODY, MascotBody, MascotFace, SCREEN } from "./mascot";

/**
 * 첫 방문 인트로. 가운데에 픽셀 게임기가 나타나고, 그 화면이 커지며 사이트가 펼쳐진 뒤
 * 조각 몇 개가 떨어져 나가 화면 아래로 사라집니다.
 *
 * 보여 줄지는 layout의 인라인 스크립트가 첫 그리기 전에 html[data-intro]로 정합니다.
 * 그 속성이 없으면 CSS가 이 요소를 아예 그리지 않으므로, 다시 방문했을 때 깜빡이지 않습니다.
 */
type Phase = "console" | "zoom" | "shatter" | "done";

// 게임기 그림의 한 칸 크기(px)
const UNIT = 7;

const CONSOLE_MS = 1_050;
/** 화면 속으로 천천히 빨려 들어가는 시간 */
const ZOOM_MS = 1_700;
/** 조각이 떨어지는 데 주는 최대 시간 */
const SHATTER_MS = 2_000;

/** 떨어져 나가는 조각 수. 번잡하지 않게 몇 개만 둡니다. */
const SHARDS = 26;
/** 화면을 덮고 있던 막이 걷히는 시간 */
const REVEAL_MS = 320;
const GRAVITY = 2_400;
const POPS = ["--pop-yellow", "--pop-pink", "--pop-blue", "--pop-green", "--pop-violet"];

type Shard = { x: number; y: number; vx: number; vy: number; size: number; at: number; color: string };

function makeShards(width: number, height: number): Shard[] {
  const style = getComputedStyle(document.documentElement);
  const colors = [
    ...POPS.map((name) => style.getPropertyValue(name).trim()),
    style.getPropertyValue("--border").trim(),
    style.getPropertyValue("--muted-foreground").trim(),
  ];
  return Array.from({ length: SHARDS }, () => ({
    x: width * (0.08 + Math.random() * 0.84),
    y: height * (0.1 + Math.random() * 0.6),
    // 살짝 튀어 올랐다가 아래로 떨어져 화면 밖으로 나갑니다.
    vx: (Math.random() - 0.5) * 260,
    vy: -(140 + Math.random() * 300),
    size: 8 + Math.floor(Math.random() * 3) * 4,
    at: Math.random() * 220,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

export function Intro() {
  const [phase, setPhase] = useState<Phase>("console");
  const consoleRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.dataset.intro) return;
    try {
      sessionStorage.setItem("mg_intro", "1");
    } catch {
      // 기억하지 못하면 다음 방문에 한 번 더 보일 뿐입니다.
    }
    let frame = 0;
    let stopped = false;
    const finish = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      delete root.dataset.intro;
      setPhase("done");
    };

    // 3) 화면을 덮고 있던 막이 걷히고, 조각 몇 개가 떨어져 나가 화면 아래로 사라집니다.
    const shatter = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return finish();
      const width = (canvas.width = window.innerWidth);
      const height = (canvas.height = window.innerHeight);
      const cover = getComputedStyle(document.documentElement).getPropertyValue("--inset").trim();
      const shards = makeShards(width, height);
      const began = performance.now();
      let last = began;
      const draw = (now: number) => {
        if (stopped) return;
        const elapsed = now - began;
        const dt = Math.min(0.034, (now - last) / 1000);
        last = now;
        ctx.clearRect(0, 0, width, height);
        if (elapsed < REVEAL_MS) {
          ctx.globalAlpha = 1 - elapsed / REVEAL_MS;
          ctx.fillStyle = cover;
          ctx.fillRect(0, 0, width, height);
          ctx.globalAlpha = 1;
        }
        let falling = 0;
        for (const shard of shards) {
          if (shard.y > height) continue;
          falling += 1;
          if (elapsed >= shard.at) {
            shard.vy += GRAVITY * dt;
            shard.x += shard.vx * dt;
            shard.y += shard.vy * dt;
          }
          // 좌표를 정수로 맞춰 픽셀이 번지지 않게 합니다.
          ctx.fillStyle = shard.color;
          ctx.fillRect(Math.round(shard.x), Math.round(shard.y), shard.size, shard.size);
        }
        if ((falling === 0 && elapsed >= REVEAL_MS) || elapsed > SHATTER_MS) return finish();
        frame = requestAnimationFrame(draw);
      };
      draw(began);
    };

    // 2) 게임기 화면 속으로 들어갑니다. 배율을 지수로 키워야 일정한 속도로 다가가는 것처럼 보입니다.
    const zoom = () => {
      setPhase("zoom");
      const target =
        Math.max(window.innerWidth / (SCREEN.w * UNIT), window.innerHeight / (SCREEN.h * UNIT)) * 1.08;
      const shift = (BODY.h * UNIT) / 2 - (SCREEN.y + SCREEN.h / 2) * UNIT;
      const began = performance.now();
      const step = (now: number) => {
        if (stopped) return;
        const t = Math.min(1, (now - began) / ZOOM_MS);
        // 천천히 출발해서 점점 빨려 들어갑니다.
        const eased = t * t * (3 - 2 * t) * 0.35 + t * t * 0.65;
        const node = consoleRef.current;
        if (node) {
          node.style.transform = `translateY(${shift * eased}px) scale(${Math.pow(target, eased)})`;
        }
        if (t < 1) {
          frame = requestAnimationFrame(step);
          return;
        }
        // 조각으로 화면을 먼저 덮은 다음 게임기를 치웁니다. 순서가 바뀌면 사이트가 한순간 비칩니다.
        shatter();
        if (!stopped) setPhase("shatter");
      };
      frame = requestAnimationFrame(step);
    };

    // 1) 게임기가 나타나 잠깐 머뭅니다.
    const timer = setTimeout(zoom, CONSOLE_MS);
    // 아무 키나 누르거나 화면을 누르면 건너뜁니다.
    window.addEventListener("keydown", finish);
    window.addEventListener("pointerdown", finish);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      window.removeEventListener("keydown", finish);
      window.removeEventListener("pointerdown", finish);
    };
  }, []);

  if (phase === "done") return null;

  // 화면 한가운데가 창 한가운데에 오도록 옮기면서 키웁니다.
  const screenCenter = {
    x: (SCREEN.x + SCREEN.w / 2) * UNIT,
    y: (SCREEN.y + SCREEN.h / 2) * UNIT,
  };
  const zoomed = phase !== "console";

  return (
    <div
      aria-hidden
      className="intro fixed inset-0 z-[200] overflow-hidden"
      style={{ background: phase === "shatter" ? "transparent" : "var(--ink)" }}
    >
      {phase === "console" && (
        <p className="font-pixel absolute inset-x-0 top-1/2 mt-36 animate-rise text-center fs-15 text-foreground">
          MINI GAME HEAVEN
        </p>
      )}
      {phase !== "shatter" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            ref={consoleRef}
            className="relative will-change-transform"
            style={{
              width: BODY.w * UNIT,
              height: BODY.h * UNIT,
              transformOrigin: `${screenCenter.x}px ${screenCenter.y}px`,
            }}
          >
            <div className="absolute inset-0 animate-pop">
              <svg
                viewBox={`0 0 ${BODY.w} ${BODY.h}`}
                shapeRendering="crispEdges"
                className="absolute inset-0 size-full"
              >
                <MascotBody />
              </svg>
              {/* 화면: 커지면 창 전체를 덮습니다. */}
              <div
                className="absolute flex flex-col items-center justify-center gap-1 bg-inset"
                style={{
                  left: SCREEN.x * UNIT,
                  top: SCREEN.y * UNIT,
                  width: SCREEN.w * UNIT,
                  height: SCREEN.h * UNIT,
                }}
              >
                {/* 화면 속 얼굴. 눈을 깜빡이다가, 화면 속으로 들어가기 시작하면 사라집니다. */}
                <svg
                  viewBox={`0 0 ${SCREEN.w} ${SCREEN.h}`}
                  shapeRendering="crispEdges"
                  className={`size-full transition-opacity duration-500 ${zoomed ? "opacity-0" : "opacity-100"}`}
                >
                  <MascotFace blink />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 걷히는 막과 떨어지는 조각을 그립니다. 그 전까지는 비어 있습니다. */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />
    </div>
  );
}
