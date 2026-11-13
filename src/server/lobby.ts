import { games, type GameSlug } from "@/lib/games";
import type { LobbyView } from "@/lib/types";
import { GameError } from "./errors";
import { allUsers, type User } from "./session";

type Listener = { user: User | undefined; push: (payload: string) => void };

/** rooms.ts와 서로 import하지 않도록, 방 목록은 등록된 함수로 받아옵니다. */
export type RoomSummary = {
  code: string;
  game: GameSlug;
  hostId: string;
  playing: boolean;
  locked: boolean;
  /** 접속 중인 참가자 ID */
  online: string[];
  total: number;
};

type Store = {
  listeners: Set<Listener>;
  rooms: () => RoomSummary[];
  timer: ReturnType<typeof setTimeout> | null;
  last: string;
  notice?: LobbyView["notice"];
};
const g = globalThis as typeof globalThis & { __miniGamesLobby?: Store };
const store: Store = (g.__miniGamesLobby ??= {
  listeners: new Set(),
  rooms: () => [],
  timer: null,
  last: "",
});

export function registerRoomSource(fn: () => RoomSummary[]): void {
  store.rooms = fn;
}

const isSolo = (game: GameSlug) => games.find((x) => x.slug === game)?.solo === true;

function snapshot(): Omit<LobbyView, "you"> {
  const all = store.rooms().filter((r) => r.online.length > 0);
  // 혼자 하는 게임의 방은 들어갈 수 없으므로 열린 방 목록에는 넣지 않습니다.
  const rooms = all.filter((r) => !isSolo(r.game));
  const where = new Map<string, RoomSummary>();
  for (const room of all) for (const id of room.online) where.set(id, room);
  const names = new Map<string, string>();
  const users: LobbyView["users"] = [];
  for (const user of allUsers()) {
    names.set(user.id, user.name);
    const room = where.get(user.id);
    if (user.connections === 0 && !room) continue;
    users.push({
      id: user.id,
      name: user.name,
      room: room ? { code: room.code, game: room.game, joinable: !isSolo(room.game) } : null,
    });
  }
  users.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return {
    notice: store.notice ?? null,
    users,
    rooms: rooms.map((r) => ({
      code: r.code,
      game: r.game,
      host: names.get(r.hostId) ?? "?",
      players: r.total,
      max: games.find((x) => x.slug === r.game)?.maxPlayers ?? 12,
      playing: r.playing,
      locked: r.locked,
    })),
  };
}

function payloadFor(listener: Listener, shared: Omit<LobbyView, "you">): string {
  const you = listener.user ? { id: listener.user.id, name: listener.user.name } : null;
  return JSON.stringify({ you, ...shared } satisfies LobbyView);
}

const NOTICE_MAX = 80;

/**
 * 모든 접속자의 화면에 공지를 띄우거나(빈 값이면) 내립니다.
 * 로비 연결은 게임 방 안에서도 유지되므로 게임 중인 사람에게도 바로 보입니다.
 */
export function setNotice(input: unknown): LobbyView["notice"] {
  const text =
    typeof input === "string"
      ? input.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim()
      : "";
  if (text.length > NOTICE_MAX) throw new GameError(`공지는 ${NOTICE_MAX}자까지 쓸 수 있습니다.`);
  store.notice = text ? { text, at: Date.now() } : null;
  touchLobby();
  return store.notice;
}

/** 방이나 접속자에 변화가 있을 때 부릅니다. 잦은 변화는 한 번으로 묶어 보냅니다. */
export function touchLobby(): void {
  if (store.timer) return;
  store.timer = setTimeout(() => {
    store.timer = null;
    const shared = snapshot();
    const key = JSON.stringify(shared);
    if (key === store.last) return;
    store.last = key;
    for (const listener of store.listeners) {
      try {
        listener.push(payloadFor(listener, shared));
      } catch {
        // 끊긴 연결은 구독 해제에서 정리됩니다.
      }
    }
  }, 40);
}

export function subscribeLobby(user: User | undefined, push: (payload: string) => void): () => void {
  const listener: Listener = { user, push };
  store.listeners.add(listener);
  if (user) {
    user.connections += 1;
    user.lastSeen = Date.now();
  }
  // 새로 들어온 사람에게는 지금 상태를 바로 보냅니다.
  push(payloadFor(listener, snapshot()));
  touchLobby();
  return () => {
    store.listeners.delete(listener);
    if (user) {
      user.connections = Math.max(0, user.connections - 1);
      user.lastSeen = Date.now();
    }
    touchLobby();
  };
}
