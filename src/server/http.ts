import { GameError } from "./rooms";

const MAX_BODY_BYTES = 4096;

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    throw new GameError("요청이 너무 큽니다.");
  }
  try {
    const text = await request.text();
    if (text.length <= MAX_BODY_BYTES) {
      const body: unknown = JSON.parse(text);
      if (body && typeof body === "object" && !Array.isArray(body)) {
        return body as Record<string, unknown>;
      }
    }
  } catch {
    // 아래에서 한 번에 처리
  }
  throw new GameError("잘못된 요청입니다.");
}

type Bucket = { count: number; resetAt: number };
const g = globalThis as typeof globalThis & { __miniGamesLimits?: Map<string, Bucket> };
const buckets = (g.__miniGamesLimits ??= new Map());

/**
 * IP별 요청 횟수 제한. 한 프로세스 안에서만 세는 간단한 방어선입니다.
 * 프록시 뒤에서는 프록시가 x-forwarded-for를 덮어쓰도록 설정해야 의미가 있습니다.
 */
export function rateLimit(request: Request, scope: string, limit: number, windowMs = 60_000): void {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new GameError("요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.");
  }
}

const cookieName = (code: string) => `mg_${code}`;

/**
 * 참가자 토큰은 HttpOnly 쿠키로만 주고받습니다.
 * URL이나 스크립트에서 접근 가능한 저장소에 두지 않아 로그·XSS로 새지 않습니다.
 */
export function sessionCookie(request: Request, code: string, token: string): string {
  const secure =
    new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  return [
    `${cookieName(code)}=${token}`,
    `Path=/api/rooms/${code}`,
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=86400",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function readSession(request: Request, code: string): string | undefined {
  const name = cookieName(code.toUpperCase());
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, value] = part.trim().split("=");
    if (key === name) return value;
  }
  return undefined;
}

export function fail(err: unknown): Response {
  if (err instanceof GameError) {
    return Response.json({ error: err.message }, { status: 400 });
  }
  console.error(err);
  return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
}

export function notFound(): Response {
  return Response.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
}
