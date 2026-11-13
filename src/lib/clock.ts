"use client";

import { useSyncExternalStore } from "react";

// 서버와 내 기기의 시계 차이. 마감 시각은 서버 시계 기준이라 보정이 필요합니다.
let offset = 0;
let current = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

export function syncClock(serverNow: number): void {
  offset = serverNow - Date.now();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  if (!timer) {
    current = Date.now() + offset;
    timer = setInterval(() => {
      current = Date.now() + offset;
      listeners.forEach((l) => l());
    }, 100);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * 서버 시계 기준 현재 시각(ms). 0.1초마다 갱신됩니다.
 * 시간을 보여 주는 작은 컴포넌트에서만 써서, 화면 전체가 매번 다시 그려지지 않게 합니다.
 */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => current || Date.now() + offset,
    () => 0,
  );
}
