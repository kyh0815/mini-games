import { randomInt } from "node:crypto";
import { getGame, type GameSlug } from "@/lib/games";
import type { GameAction, RoomView } from "@/lib/types";
import { GameError } from "./errors";
import { gameModules } from "./games";
import { registerRoomSource, touchLobby } from "./lobby";
import { pruneUsers, type User } from "./session";

export { GameError };

/** 방 안의 참가자. id는 전역 사용자 ID와 같습니다. */
export type Player = {
  id: string;
  name: string;
  connections: number;
};

type Listener = {
  playerId: string;
  push: (view: RoomView) => void;
  /** 화면 상태와 별개로 흘려보내는 이벤트 (그림 획 등) */
  send: (event: string, data: unknown) => void;
  /** 방에서 내보낼 때 연결을 닫습니다. */
  end: () => void;
};

export type Room = {
  code: string;
  game: GameSlug;
  hostId: string;
  players: Player[];
  banned: Set<string>;
  // 게임별 상태. 각 게임 모듈만 내부 구조를 압니다.
  state: unknown;
  listeners: Map<symbol, Listener>;
  timer: ReturnType<typeof setTimeout> | null;
  lastActive: number;
};

const MAX_ROOMS = 300;
/** 모두 나간 방을 지우기까지의 시간 */
const EMPTY_ROOM_TTL_MS = 60_000;
/** 새로고침·잠깐의 끊김을 봐주는 시간 */
const LEAVE_GRACE_MS = 6_000;
// 헷갈리는 글자(0/O, 1/I 등) 제외
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Store = { rooms: Map<string, Room>; sweeper?: ReturnType<typeof setInterval> };
// dev 모드의 모듈 재로딩에도 방이 유지되도록 globalThis에 둡니다.
const g = globalThis as typeof globalThis & { __miniGamesStore?: Store };
const store: Store = (g.__miniGamesStore ??= { rooms: new Map() });

function inLobby(room: Room): boolean {
  return (room.state as { phase?: string }).phase === "lobby";
}

registerRoomSource(() =>
  [...store.rooms.values()].map((room) => ({
    code: room.code,
    game: room.game,
    hostId: room.hostId,
    playing: !inLobby(room),
    online: room.players.filter((p) => p.connections > 0).map((p) => p.id),
    total: room.players.length,
  })),
);

function deleteRoom(room: Room): void {
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
  for (const listener of [...room.listeners.values()]) listener.end();
  store.rooms.delete(room.code);
  touchLobby();
}

if (!store.sweeper) {
  store.sweeper = setInterval(() => {
    const now = Date.now();
    for (const room of [...store.rooms.values()]) {
      if (room.listeners.size === 0 && now - room.lastActive > EMPTY_ROOM_TTL_MS) deleteRoom(room);
    }
    pruneUsers();
  }, 15_000);
  store.sweeper.unref?.();
}

function newCode(): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < 4; i++) code += CODE_CHARS[randomInt(CODE_CHARS.length)];
    if (!store.rooms.has(code)) return code;
  }
}

export function createRoom(game: GameSlug, user: User): Room {
  if (store.rooms.size >= MAX_ROOMS) {
    throw new GameError("지금은 방을 더 만들 수 없습니다. 잠시 뒤에 다시 시도해 주세요.");
  }
  const room: Room = {
    code: newCode(),
    game,
    hostId: user.id,
    players: [{ id: user.id, name: user.name, connections: 0 }],
    banned: new Set(),
    state: gameModules[game].init(),
    listeners: new Map(),
    timer: null,
    lastActive: Date.now(),
  };
  store.rooms.set(room.code, room);
  touchLobby();
  return room;
}

export function getRoom(code: string): Room | undefined {
  return store.rooms.get(code.toUpperCase());
}

export function findPlayer(room: Room, user: User | undefined): Player | undefined {
  return user ? room.players.find((p) => p.id === user.id) : undefined;
}

/** 이미 참가 중이면 그 자리로 돌아갑니다. */
export function joinRoom(room: Room, user: User): Player {
  const existing = findPlayer(room, user);
  if (existing) return existing;
  if (room.banned.has(user.id)) throw new GameError("방장이 내보낸 방에는 다시 들어갈 수 없습니다.");
  const max = getGame(room.game)?.maxPlayers ?? 12;
  if (room.players.length >= max) throw new GameError(`방이 가득 찼습니다. (최대 ${max}명)`);
  const player: Player = { id: user.id, name: user.name, connections: 0 };
  room.players.push(player);
  room.lastActive = Date.now();
  broadcast(room);
  return player;
}

/** 닉네임을 바꾸면 들어가 있는 방에도 반영합니다. */
export function renameEverywhere(user: User): void {
  for (const room of store.rooms.values()) {
    const player = findPlayer(room, user);
    if (player && player.name !== user.name) {
      player.name = user.name;
      broadcast(room);
    }
  }
  touchLobby();
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
  touchLobby();
}

/** 화면 상태 전체를 다시 보내지 않고 작은 이벤트만 흘려보냅니다. */
export function emit(room: Room, event: string, data: unknown, exceptPlayerId?: string): void {
  for (const listener of room.listeners.values()) {
    if (listener.playerId === exceptPlayerId) continue;
    try {
      listener.send(event, data);
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
  handlers: Pick<Listener, "push" | "send" | "end">,
): () => void {
  const key = Symbol();
  const listener: Listener = { playerId: player.id, ...handlers };
  room.listeners.set(key, listener);
  player.connections += 1;
  room.lastActive = Date.now();
  broadcast(room);
  gameModules[room.game].onSubscribe?.(room, (event, data) => listener.send(event, data));
  return () => {
    if (!room.listeners.delete(key)) return;
    player.connections = Math.max(0, player.connections - 1);
    room.lastActive = Date.now();
    broadcast(room);
    if (player.connections === 0) {
      setTimeout(() => handleGone(room, player), LEAVE_GRACE_MS).unref?.();
    }
  };
}

function passHost(room: Room, from: Player): void {
  if (room.hostId !== from.id) return;
  const next = room.players.find((p) => p !== from && p.connections > 0);
  if (next) room.hostId = next.id;
}

function removeIfLobby(room: Room, player: Player): void {
  passHost(room, player);
  if (inLobby(room)) room.players = room.players.filter((p) => p !== player);
  if (room.players.length === 0) deleteRoom(room);
}

/** 새로고침은 봐주고, 정말 나간 사람만 정리합니다. */
function handleGone(room: Room, player: Player): void {
  if (!store.rooms.has(room.code)) return;
  if (player.connections > 0 || !room.players.includes(player)) return;
  removeIfLobby(room, player);
  broadcast(room);
}

/** 플레이어의 연결을 모두 닫습니다. 게임 중이면 기록이 깨지지 않게 명단에는 남깁니다. */
function eject(room: Room, player: Player): void {
  for (const listener of [...room.listeners.values()]) {
    if (listener.playerId === player.id) listener.end();
  }
  player.connections = 0;
  removeIfLobby(room, player);
}

export function dispatch(room: Room, player: Player, action: unknown): void {
  if (!action || typeof action !== "object" || typeof (action as GameAction).type !== "string") {
    throw new GameError("잘못된 요청입니다.");
  }
  const a = action as GameAction;
  const isHost = room.hostId === player.id;
  room.lastActive = Date.now();
  if (a.type === "leave") {
    eject(room, player);
  } else if (a.type === "kick") {
    if (!isHost) throw new GameError("방장만 할 수 있습니다.");
    if (!inLobby(room)) throw new GameError("대기실에서만 내보낼 수 있습니다.");
    const target = room.players.find((p) => p.id === a.target);
    if (!target || target === player) throw new GameError("내보낼 사람을 찾을 수 없습니다.");
    room.banned.add(target.id);
    eject(room, target);
  } else if (a.type === "reset") {
    if (!isHost) throw new GameError("방장만 할 수 있습니다.");
    clearRoomTimer(room);
    room.state = gameModules[room.game].init();
    // 게임 도중 나간 사람은 대기실로 돌아올 때 정리합니다.
    room.players = room.players.filter((p) => p.connections > 0 || p.id === room.hostId);
  } else if (gameModules[room.game].handle(room, player, a, isHost) === "quiet") {
    // 그림 획처럼 잦은 동작은 화면 상태 전체를 다시 보내지 않습니다.
    return;
  }
  if (store.rooms.has(room.code)) broadcast(room);
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
