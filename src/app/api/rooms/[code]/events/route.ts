import { notFound, sse } from "@/server/http";
import { findPlayer, getRoom, subscribe } from "@/server/rooms";
import { getUser } from "@/server/session";

/** 방 상태를 Server-Sent Events로 내려보냅니다. 상태가 바뀔 때마다 그 사람이 볼 화면 상태를 보냅니다. */
export async function GET(request: Request, ctx: RouteContext<"/api/rooms/[code]/events">) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) return notFound();
  const player = findPlayer(room, getUser(request));
  if (!player) {
    return Response.json({ error: "이 방의 참가자가 아닙니다." }, { status: 403 });
  }
  return sse(request, ({ send, close }) =>
    subscribe(room, player, {
      push: (view) => send(JSON.stringify(view)),
      send: (event, data) => send(JSON.stringify(data), event),
      end: () => {
        // 나가거나 내보내진 경우: 재연결하지 않도록 알리고 닫습니다.
        send("{}", "gone");
        close();
      },
    }),
  );
}
