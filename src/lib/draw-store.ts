"use client";

import type { Stroke } from "./types";

type Change = { type: "reset" } | { type: "append"; stroke: Stroke; from: number };

/**
 * 그림판의 획 목록. 서버에서 오는 이벤트와 내가 그리는 획이 모두 여기로 모이고,
 * 캔버스는 변화만 받아 그립니다. (React 상태로 두면 점 하나마다 화면 전체가 다시 그려집니다)
 */
let strokes: Stroke[] = [];
const listeners = new Set<(change: Change) => void>();

export const drawStore = {
  get strokes(): readonly Stroke[] {
    return strokes;
  },
  subscribe(fn: (change: Change) => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  /** 전체 교체: 접속 직후, 되돌리기, 전체 지우기, 차례 변경 */
  reset(next: Stroke[]): void {
    strokes = next.map((s) => ({ ...s, points: [...s.points] }));
    listeners.forEach((fn) => fn({ type: "reset" }));
  },
  /** 점 추가. 마지막 획과 id가 같으면 이어 붙입니다. */
  append(part: Stroke): void {
    const last = strokes[strokes.length - 1];
    if (last && last.id === part.id) {
      const from = last.points.length;
      last.points.push(...part.points);
      listeners.forEach((fn) => fn({ type: "append", stroke: last, from }));
    } else {
      const stroke = { ...part, points: [...part.points] };
      strokes.push(stroke);
      listeners.forEach((fn) => fn({ type: "append", stroke, from: 0 }));
    }
  },
  /** 내 마지막 획을 먼저 지웁니다. 서버가 곧 같은 결과를 다시 보내 줍니다. */
  undo(): void {
    strokes = strokes.slice(0, -1);
    listeners.forEach((fn) => fn({ type: "reset" }));
  },
};
