import type { GameSlug } from "./games";

/** 명예의 전당의 순위표 하나 */
export type Board = {
  key: string;
  game: GameSlug;
  label: string;
  /** 낮을수록 좋은지, 높을수록 좋은지 */
  better: "low" | "high";
  format: "seconds" | "ms" | "count" | "steps";
};

export const BOARDS: Board[] = [
  { key: "memory-easy", game: "memory", label: "기억력 게임 · 쉬움", better: "low", format: "seconds" },
  { key: "memory-normal", game: "memory", label: "기억력 게임 · 보통", better: "low", format: "seconds" },
  { key: "memory-hard", game: "memory", label: "기억력 게임 · 어려움", better: "low", format: "seconds" },
  { key: "reaction", game: "reaction", label: "반응속도", better: "low", format: "ms" },
  { key: "aim", game: "aim", label: "에임 트레이너", better: "high", format: "count" },
  { key: "stairs", game: "stairs", label: "계단 오르기", better: "high", format: "steps" },
];

export type RecordRow = { name: string; value: number; detail: string; at: number };
export type BoardRows = { key: string; rows: RecordRow[] };

export function formatRecord(board: Board, value: number): string {
  switch (board.format) {
    case "seconds":
      return `${(value / 1000).toFixed(2)}초`;
    case "ms":
      return `${Math.round(value)}ms`;
    case "count":
      // 소수 자리는 동점일 때 순서를 가르는 값이라 보여 주지 않습니다.
      return `${Math.floor(value)}점`;
    case "steps":
      return `${value}계단`;
  }
}

export function getBoard(key: string): Board | undefined {
  return BOARDS.find((b) => b.key === key);
}
