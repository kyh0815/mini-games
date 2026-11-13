import type { BoardRows } from "@/lib/records";
import { boardsFor, submitRecord } from "../records";
import type { Room } from "../rooms";

/** 혼자 하는 게임이 공통으로 갖는 상태: 방금 끝낸 판의 기록 결과 */
export type SoloState = {
  last: { board: string; value: number; rank: number; best: boolean } | null;
};

/** 기록을 명예의 전당에 올리고, 화면에 보여 줄 결과를 상태에 남깁니다. */
export function record(room: Room, state: SoloState, board: string, value: number, detail = ""): void {
  const name = room.players[0]?.name ?? "?";
  state.last = { board, value, ...submitRecord(board, name, value, detail) };
}

export function soloView(state: SoloState, boardKeys: string[]): { boards: BoardRows[]; last: SoloState["last"] } {
  return { boards: boardsFor(boardKeys), last: state.last };
}
