import { GameError } from "./errors";

const MAX_BODY_BYTES = 16_384;

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    throw new GameError("요청이 너무 큽니다.");
  }
  try {
    const text = await request.text();
    if (text.length <= MAX_BODY_BYTES) {
      const body: unknown = text ? JSON.parse(text) : {};
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

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

type SseWriter = {
  /** event를 생략하면 기본 message 이벤트로 나갑니다. */
  send: (data: string, event?: string) => void;
  close: () => void;
};

/**
 * Server-Sent Events 응답을 만듭니다.
 * open은 구독을 걸고 해제 함수를 돌려줍니다. 연결이 끊기면 자동으로 해제합니다.
 */
export function sse(request: Request, open: (writer: SseWriter) => () => void): Response {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let release = () => {};
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        release();
        try {
          controller.close();
        } catch {
          // 이미 닫힌 스트림
        }
      };
      // 끊겼을 때 1초 뒤 다시 붙도록 알려 둡니다.
      write("retry: 1000\n\n");
      const heartbeat = setInterval(() => write(": ping\n\n"), 20_000);
      release = open({
        send: (data, event) => write(`${event ? `event: ${event}\n` : ""}data: ${data}\n\n`),
        close: () => cleanup(),
      });
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
