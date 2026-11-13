import { notFound } from "@/server/http";
import { findPlayer, getRoom, subscribe } from "@/server/rooms";

const HEARTBEAT_MS = 20_000;

/** 방 상태를 Server-Sent Events로 내려보냅니다. 상태가 바뀔 때마다 전체 화면 상태를 보냅니다. */
export async function GET(request: Request, ctx: RouteContext<"/api/rooms/[code]/events">) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) return notFound();
  const player = findPlayer(room, new URL(request.url).searchParams.get("token"));
  if (!player) {
    return Response.json({ error: "이 방의 참가자가 아닙니다." }, { status: 403 });
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const unsubscribe = subscribe(room, player, (view) => {
        write(`data: ${JSON.stringify(view)}\n\n`);
      });
      const heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // 이미 닫힌 스트림
        }
      };
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
