import type { T } from "@/lib/i18n";
import type { GameSlug } from "./games";

/** 명예의 전당의 순위표 하나 */
export type Board = {
  key: string;
  game: GameSlug;
  label: string;
  /** 낮을수록 좋은지, 높을수록 좋은지 */
  better: "low" | "high";
  format: "seconds" | "ms" | "count" | "steps" | "cards";
};

export const BOARDS: Board[] = [
  { key: "memory-easy", game: "memory", label: "기억력 게임 · 쉬움", better: "low", format: "seconds" },
  { key: "memory-normal", game: "memory", label: "기억력 게임 · 보통", better: "low", format: "seconds" },
  { key: "memory-hard", game: "memory", label: "기억력 게임 · 어려움", better: "low", format: "seconds" },
  { key: "sequence", game: "sequence", label: "기억력 게임 2", better: "high", format: "cards" },
  { key: "reaction", game: "reaction", label: "반응속도", better: "low", format: "ms" },
  { key: "aim-20", game: "aim", label: "에임 트레이너", better: "high", format: "count" },
  { key: "stairs-2", game: "stairs", label: "계단 오르기", better: "high", format: "steps" },
];

/** 화면에 내려가는 기록 한 줄. mine은 지금 보는 사람의 기기에서 세운 기록인지입니다. */
export type RecordRow = { name: string; value: number; detail: string; at: number; mine: boolean };
export type BoardRows = { key: string; rows: RecordRow[] };

/** 기록을 단위와 함께 보여 줍니다. 단위는 화면 언어에 맞춥니다. */
export function formatRecord(board: Board, value: number, t: T): string {
  switch (board.format) {
    case "seconds":
      return t("{n}초", { n: (value / 1000).toFixed(2) });
    case "ms":
      return `${Math.round(value)}ms`;
    case "count":
      // 소수 자리는 동점일 때 순서를 가르는 값이라 보여 주지 않습니다.
      return t("{n}점", { n: Math.floor(value) });
    case "cards":
      return t("{n}장", { n: value });
    case "steps":
      return t("{n}계단", { n: value });
  }
}

export function getBoard(key: string): Board | undefined {
  return BOARDS.find((b) => b.key === key);
}
