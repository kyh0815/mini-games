import { createHash, randomBytes } from "node:crypto";
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
/** 접속이 없는 사람을 메모리에서 지우기까지의 시간 */
const USER_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** 쿠키는 그 기기를 알아보는 표식이기도 해서 오래 둡니다(브라우저가 허용하는 최대에 가깝게). */
const COOKIE_MAX_AGE_S = 400 * 24 * 60 * 60;
const SID_PATTERN = /^[0-9a-f]{48}$/;

/**
 * 기록의 주인을 가리는 값. 닉네임이 아니라 기기(쿠키)에서 만들어지므로,
 * 남의 닉네임을 써도 그 사람의 기록을 건드릴 수 없습니다.
 * 쿠키 값 자체는 어디에도 저장하지 않고 이 해시만 씁니다.
 */
export function ownerOf(user: Pick<User, "sid">): string {
  return createHash("sha256").update(`mg-owner:${user.sid}`).digest("hex").slice(0, 32);
}

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
  // 서버가 다시 켜져 세션을 잊었더라도, 쿠키가 남아 있으면 같은 기기로 이어 갑니다.
  const kept = readCookie(request);
  const user: User = {
    id: randomBytes(6).toString("hex"),
    sid: kept && SID_PATTERN.test(kept) && !store.users.has(kept) ? kept : randomBytes(24).toString("hex"),
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
    `Max-Age=${COOKIE_MAX_AGE_S}`,
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
