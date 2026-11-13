"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { post } from "@/lib/client";
import { CANVAS_H, CANVAS_W, PAPER } from "@/lib/draw";
import { drawStore } from "@/lib/draw-store";
import { useT } from "@/lib/i18n";
import type { Stroke } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 좌표는 0~1000으로 정규화해 주고받습니다. */
const toX = (v: number) => (v / 1000) * CANVAS_W;
const toY = (v: number) => (v / 1000) * CANVAS_H;

function paint(ctx: CanvasRenderingContext2D, stroke: Stroke, from: number): void {
  const p = stroke.points;
  if (p.length < 2) return;
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // 이어 그릴 때는 직전 점에서 시작해야 선이 끊기지 않습니다.
  const start = Math.max(0, from - 2);
  if (p.length === 2) {
    ctx.beginPath();
    ctx.arc(toX(p[0]), toY(p[1]), stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(toX(p[start]), toY(p[start + 1]));
  for (let i = start + 2; i < p.length; i += 2) ctx.lineTo(toX(p[i]), toY(p[i + 1]));
  ctx.stroke();
}

function repaint(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (const stroke of drawStore.strokes) paint(ctx, stroke, 0);
}

export function DrawCanvas({
  code,
  canDraw,
  color,
  size,
  className,
}: {
  code: string;
  canDraw: boolean;
  color: string;
  size: number;
  className?: string;
}) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useRef<{ id: string; lastX: number; lastY: number } | null>(null);
  // 보낼 점을 줄 세워 두었다가, 앞선 전송이 끝난 뒤에 보냅니다. 순서가 뒤바뀌면 선이 엉킵니다.
  const outbox = useRef<{ queue: Stroke[]; sending: boolean }>({ queue: [], sending: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = CANVAS_W * scale;
    canvas.height = CANVAS_H * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    repaint(ctx);
    return drawStore.subscribe((change) => {
      if (change.type === "reset") repaint(ctx);
      else paint(ctx, change.stroke, change.from);
    });
  }, []);

  const flush = async () => {
    const box = outbox.current;
    if (box.sending) return;
    box.sending = true;
    while (box.queue.length > 0) {
      const part = box.queue[0];
      const points = part.points.splice(0, 256);
      if (part.points.length === 0) box.queue.shift();
      await post(`/api/rooms/${code}/action`, {
        action: { type: "stroke", id: part.id, color: part.color, size: part.size, points },
      }).catch(() => {
        // 한 묶음이 빠져도 그림은 계속 그릴 수 있습니다.
      });
    }
    box.sending = false;
  };

  const add = (x: number, y: number) => {
    const stroke = active.current;
    if (!stroke) return;
    stroke.lastX = x;
    stroke.lastY = y;
    drawStore.append({ id: stroke.id, color, size, points: [x, y] });
    const queue = outbox.current.queue;
    const last = queue[queue.length - 1];
    if (last && last.id === stroke.id) last.points.push(x, y);
    else queue.push({ id: stroke.id, color, size, points: [x, y] });
    void flush();
  };

  const locate = (e: PointerEvent | ReactPointerEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.max(0, Math.min(1000, Math.round(v)));
    return [
      clamp(((e.clientX - rect.left) / rect.width) * 1000),
      clamp(((e.clientY - rect.top) / rect.height) * 1000),
    ];
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = locate(e);
    active.current = { id: Math.random().toString(36).slice(2, 10), lastX: x, lastY: y };
    add(x, y);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!active.current) return;
    // 빠르게 움직일 때 브라우저가 묶어 둔 중간 점까지 써야 선이 각지지 않습니다.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of events.length > 0 ? events : [e.nativeEvent]) {
      const [x, y] = locate(ev);
      const dx = x - active.current.lastX;
      const dy = y - active.current.lastY;
      if (dx * dx + dy * dy >= 9) add(x, y);
    }
  };

  const end = () => {
    active.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      role="img"
      aria-label={t("그림판")}
      className={cn(
        "block aspect-[4/3] w-full touch-none bg-[#f3efe4] select-none",
        canDraw ? "cursor-crosshair" : "cursor-default",
        className,
      )}
    />
  );
}
