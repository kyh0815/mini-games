import { connection } from "next/server";
import { allBoards } from "@/server/records";

/** 명예의 전당 전체 */
export async function GET() {
  // 기록은 수시로 바뀌므로 빌드 때 굳히지 않고 요청마다 읽습니다.
  await connection();
  return Response.json({ boards: allBoards() }, { headers: { "Cache-Control": "no-store" } });
}
