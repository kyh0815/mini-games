import { randomBytes, randomInt } from "node:crypto";
import type { GameSlug } from "@/lib/games";
import type { GameAction, RoomView } from "@/lib/types";
import { gameModules } from "./games";

export type Player = {
  id: string;
  token: string;
  name: string;
  connections: number;
};

export type Room = {
  code: string;
  game: GameSlug;
  hostId: string;
  players: Player[];
  // 게임별 상태. 각 게임 모듈만 내부 구조를 압니다.
  state: unknown;
  listeners: Map<symbol, { playerId: string; push: (view: RoomView) => void }>;
  timer: ReturnType<typeof setTimeout> | null;
  lastActive: number;
};

export class GameError extends Error {}

const MAX_ROOMS = 300;
const MAX_PLAYERS = 12;
const ROOM_TTL_MS = 30 * 60 * 1000;
const LEAVE_GRACE_MS = 8000;
// 헷갈리는 글자(0/O, 1/I 등) 제외
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Store = { rooms: Map<string, Room>; sweeper?: ReturnType<typeof setInterval> };
// dev 모드의 모듈 재로딩에도 방이 유지되도록 globalThis에 둡니다.
const g = globalThis as typeof globalThis & { __miniGamesStore?: Store };
const store: Store = (g.__miniGamesStore ??= { rooms: new Map() });

if (!store.sweeper) {
  store.sweeper = setInterval(() => {
    const now = Date.now();
    for (const room of store.rooms.values()) {
      if (room.listeners.size === 0 && now - room.lastActive > ROOM_TTL_MS) {
        if (room.timer) clearTimeout(room.timer);
        store.rooms.delete(room.code);
      }
    }
  }, 60_000);
  store.sweeper.unref?.();
}

function newCode(): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < 4; i++) code += CODE_CHARS[randomInt(CODE_CHARS.length)];
    if (!store.rooms.has(code)) return code;
  }
}

export function cleanName(raw: unknown): string {
  if (typeof raw !== "string") throw new GameError("이름을 입력해 주세요.");
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 1 || name.length > 12) {
    throw new GameError("이름은 1~12자로 입력해 주세요.");
  }
  return name;
}

function newPlayer(name: string): Player {
  return {
    id: randomBytes(6).toString("hex"),
    token: randomBytes(24).toString("hex"),
    name,
    connections: 0,
  };
}

export function createRoom(game: GameSlug, name: string): { room: Room; player: Player } {
  if (store.rooms.size >= MAX_ROOMS) {
    throw new GameError("지금은 방을 더 만들 수 없습니다. 잠시 뒤에 다시 시도해 주세요.");
  }
  const player = newPlayer(name);
  const room: Room = {
    code: newCode(),
    game,
    hostId: player.id,
    players: [player],
    state: gameModules[game].init(),
    listeners: new Map(),
    timer: null,
    lastActive: Date.now(),
  };
  store.rooms.set(room.code, room);
  return { room, player };
}

export function getRoom(code: string): Room | undefined {
  return store.rooms.get(code.toUpperCase());
}

export function findPlayer(room: Room, token: unknown): Player | undefined {
  if (typeof token !== "string" || token.length === 0) return undefined;
  return room.players.find((p) => p.token === token);
}

export function joinRoom(room: Room, name: string): Player {
  if (room.players.length >= MAX_PLAYERS) {
    throw new GameError(`방이 가득 찼습니다. (최대 ${MAX_PLAYERS}명)`);
  }
  if (room.players.some((p) => p.name === name)) {
    throw new GameError("이미 같은 이름을 쓰는 사람이 있습니다.");
  }
  const player = newPlayer(name);
  room.players.push(player);
  room.lastActive = Date.now();
  broadcast(room);
  return player;
}

export function viewFor(room: Room, playerId: string): RoomView {
  return {
    code: room.code,
    game: room.game,
    hostId: room.hostId,
    you: playerId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      online: p.connections > 0,
    })),
    serverNow: Date.now(),
    state: gameModules[room.game].view(room, playerId),
  } as RoomView;
}

export function broadcast(room: Room): void {
  for (const listener of room.listeners.values()) {
    try {
      listener.push(viewFor(room, listener.playerId));
    } catch {
      // 끊긴 연결은 unsubscribe에서 정리됩니다.
    }
  }
}

/** 방마다 타이머는 하나만 둡니다. 새로 걸면 이전 것은 취소됩니다. */
export function setRoomTimer(room: Room, ms: number, fn: () => void): void {
  clearRoomTimer(room);
  room.timer = setTimeout(() => {
    room.timer = null;
    try {
      fn();
    } catch (err) {
      console.error("room timer failed", err);
    }
    broadcast(room);
  }, ms);
}

export function clearRoomTimer(room: Room): void {
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
}

export function subscribe(
  room: Room,
  player: Player,
  push: (view: RoomView) => void,
): () => void {
  const key = Symbol();
  room.listeners.set(key, { playerId: player.id, push });
  player.connections += 1;
  room.lastActive = Date.now();
  broadcast(room);
  return () => {
    room.listeners.delete(key);
    player.connections = Math.max(0, player.connections - 1);
    room.lastActive = Date.now();
    broadcast(room);
    if (player.connections === 0) {
      setTimeout(() => handleGone(room, player), LEAVE_GRACE_MS).unref?.();
    }
  };
}

/** 새로고침은 봐주고, 정말 나간 사람만 정리합니다. */
function handleGone(room: Room, player: Player): void {
  if (player.connections > 0 || !room.players.includes(player)) return;
  const inLobby = (room.state as { phase?: string }).phase === "lobby";
  if (inLobby) {
    room.players = room.players.filter((p) => p !== player);
  }
  if (room.hostId === player.id) {
    const next = room.players.find((p) => p.connections > 0);
    if (next) room.hostId = next.id;
  }
  broadcast(room);
}

export function dispatch(room: Room, player: Player, action: unknown): void {
  if (!action || typeof action !== "object" || typeof (action as GameAction).type !== "string") {
    throw new GameError("잘못된 요청입니다.");
  }
  const a = action as GameAction;
  const isHost = room.hostId === player.id;
  room.lastActive = Date.now();
  if (a.type === "reset") {
    if (!isHost) throw new GameError("방장만 할 수 있습니다.");
    clearRoomTimer(room);
    room.state = gameModules[room.game].init();
    // 게임 도중 나간 사람은 대기실로 돌아올 때 정리합니다.
    room.players = room.players.filter((p) => p.connections > 0 || p.id === room.hostId);
  } else {
    gameModules[room.game].handle(room, player, a, isHost);
  }
  broadcast(room);
}

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)];
}

export function onlineIds(room: Room): string[] {
  return room.players.filter((p) => p.connections > 0).map((p) => p.id);
}

export function requireHost(isHost: boolean): void {
  if (!isHost) throw new GameError("방장만 할 수 있습니다.");
}
