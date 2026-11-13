import { connection } from "next/server";
import { allBoards } from "@/server/records";
import { getUser, ownerOf } from "@/server/session";

/** 명예의 전당 전체. 보는 사람의 기기에서 세운 기록에는 표시가 붙습니다. */
export async function GET(request: Request) {
  // 기록은 수시로 바뀌므로 빌드 때 굳히지 않고 요청마다 읽습니다.
  await connection();
  const user = getUser(request);
  return Response.json(
    { boards: allBoards(user ? ownerOf(user) : undefined) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
