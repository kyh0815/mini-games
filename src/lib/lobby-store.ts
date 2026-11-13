"use client";

import { useSyncExternalStore } from "react";
import type { LobbyView } from "./types";

export type LobbyState = LobbyView & {
  /** 첫 상태를 받았는지 */
  ready: boolean;
  connected: boolean;
};

const EMPTY: LobbyState = { ready: false, connected: false, you: null, users: [], rooms: [] };

let state: LobbyState = EMPTY;
let source: EventSource | null = null;
const listeners = new Set<() => void>();

function set(next: LobbyState): void {
  state = next;
  listeners.forEach((fn) => fn());
}

function connect(): void {
  source?.close();
  const es = new EventSource("/api/lobby/events");
  source = es;
  es.onmessage = (event) => {
    set({ ...(JSON.parse(event.data) as LobbyView), ready: true, connected: true });
  };
  es.onopen = () => set({ ...state, connected: true });
  es.onerror = () => set({ ...state, connected: false });
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  // 사이트에 머무는 동안 연결을 하나만 유지합니다. 이 연결이 곧 '접속 중' 표시입니다.
  if (!source) connect();
  return () => {
    listeners.delete(fn);
  };
}

/** 닉네임을 새로 정하면 쿠키가 생기므로, 연결을 다시 맺어 서버가 나를 알아보게 합니다. */
export function reconnectLobby(): void {
  if (source) connect();
}

/** 서버 응답을 기다리지 않고 내 정보를 먼저 반영합니다. */
export function setLobbyYou(you: LobbyView["you"]): void {
  set({ ...state, you });
}

export function useLobby(): LobbyState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
}
