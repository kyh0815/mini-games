import { sse } from "@/server/http";
import { subscribeLobby } from "@/server/lobby";
import "@/server/rooms";
import { getUser } from "@/server/session";

/** 방 목록과 접속자 목록을 실시간으로 내려보냅니다. */
export async function GET(request: Request) {
  const user = getUser(request);
  return sse(request, ({ send }) => subscribeLobby(user, (payload) => send(payload)));
}
