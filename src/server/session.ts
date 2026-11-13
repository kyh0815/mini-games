import { randomBytes } from "node:crypto";
import { GameError } from "./errors";

/** 닉네임을 정한 방문자. 방과 무관하게 사이트 전체에서 같은 사람입니다. */
export type User = {
  id: string;
  sid: string;
  name: string;
  /** 열려 있는 로비 연결 수. 0보다 크면 접속 중입니다. */
  connections: number;
  lastSeen: number;
};

const COOKIE = "mg_session";
const USER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Store = { users: Map<string, User> };
const g = globalThis as typeof globalThis & { __miniGamesSessions?: Store };
const store: Store = (g.__miniGamesSessions ??= { users: new Map() });

export function cleanName(raw: unknown): string {
  if (typeof raw !== "string") throw new GameError("닉네임을 입력해 주세요.");
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 1 || name.length > 12) {
    throw new GameError("닉네임은 1~12자로 입력해 주세요.");
  }
  return name;
}

function readCookie(request: Request): string | undefined {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, value] = part.trim().split("=");
    if (key === COOKIE) return value;
  }
  return undefined;
}

export function getUser(request: Request): User | undefined {
  const sid = readCookie(request);
  const user = sid ? store.users.get(sid) : undefined;
  if (user) user.lastSeen = Date.now();
  return user;
}

export function requireUser(request: Request): User {
  const user = getUser(request);
  if (!user) throw new GameError("닉네임을 먼저 정해 주세요.");
  return user;
}

export function allUsers(): Iterable<User> {
  return store.users.values();
}

/** 닉네임을 정하거나 바꿉니다. 처음이면 세션을 새로 만듭니다. */
export function saveUser(request: Request, rawName: unknown): { user: User; created: boolean } {
  const name = cleanName(rawName);
  const existing = getUser(request);
  for (const other of store.users.values()) {
    // 접속 중인 다른 사람과 이름이 겹치면 누가 누군지 알 수 없습니다.
    if (other !== existing && other.connections > 0 && other.name === name) {
      throw new GameError("지금 다른 사람이 쓰고 있는 닉네임입니다.");
    }
  }
  if (existing) {
    existing.name = name;
    return { user: existing, created: false };
  }
  const user: User = {
    id: randomBytes(6).toString("hex"),
    sid: randomBytes(24).toString("hex"),
    name,
    connections: 0,
    lastSeen: Date.now(),
  };
  store.users.set(user.sid, user);
  return { user, created: true };
}

/**
 * 세션은 HttpOnly 쿠키로만 주고받습니다.
 * URL이나 스크립트에서 접근 가능한 저장소에 두지 않아 로그·XSS로 새지 않습니다.
 */
export function sessionCookie(request: Request, user: User): string {
  const secure =
    new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  return [
    `${COOKIE}=${user.sid}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${USER_TTL_MS / 1000}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function pruneUsers(): void {
  const now = Date.now();
  for (const user of store.users.values()) {
    if (user.connections === 0 && now - user.lastSeen > USER_TTL_MS) {
      store.users.delete(user.sid);
    }
  }
}
