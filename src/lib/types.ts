import type { GameSlug } from "./games";

export type PlayerView = { id: string; name: string; online: boolean };

export type ChosungView = {
  phase: "lobby" | "question" | "reveal" | "result";
  categories: { key: string; label: string }[];
  round: number;
  totalRounds: number;
  category: string;
  chosung: string;
  hint: string | null;
  /** reveal 단계에서만 공개 */
  answer: string | null;
  winnerId: string | null;
  deadline: number;
  scores: Record<string, number>;
  guesses: { playerId: string; text: string }[];
};

export type LiarView = {
  phase: "lobby" | "discuss" | "vote" | "guess" | "result";
  categories: { key: string; label: string }[];
  category: string;
  participants: string[];
  order: string[];
  youPlaying: boolean;
  youAreLiar: boolean;
  /** 시민에게만, 그리고 결과 단계에서 공개 */
  word: string | null;
  voted: string[];
  yourVote: string | null;
  /** 결과 단계에서만 공개 */
  votes: Record<string, string> | null;
  accusedId: string | null;
  liarId: string | null;
  liarGuess: string | null;
  winner: "liar" | "citizens" | null;
  deadline: number;
};

export type TypingView = {
  phase: "lobby" | "race" | "result";
  text: string;
  strokes: number;
  startAt: number;
  deadline: number;
  participants: string[];
  progress: Record<string, { chars: number; finishedMs: number | null }>;
};

export type WordChainView = {
  phase: "lobby" | "play" | "result";
  order: string[];
  lives: Record<string, number>;
  maxLives: number;
  turnId: string | null;
  chain: { word: string; playerId: string }[];
  starts: string[] | null;
  deadline: number;
  turnSeconds: number;
  objections: string[];
  objectionsNeeded: number;
  lastEvent: {
    type: "timeout" | "rejected";
    playerId: string;
    word?: string;
  } | null;
  winnerId: string | null;
};

type Base = {
  code: string;
  hostId: string;
  you: string;
  players: PlayerView[];
  serverNow: number;
};

export type RoomView =
  | (Base & { game: "chosung"; state: ChosungView })
  | (Base & { game: "liar"; state: LiarView })
  | (Base & { game: "typing"; state: TypingView })
  | (Base & { game: "wordchain"; state: WordChainView });

export type GameAction = { type: string; [key: string]: unknown };

export type { GameSlug };
