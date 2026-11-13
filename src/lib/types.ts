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

export type Stroke = {
  id: string;
  color: string;
  size: number;
  /** x, y가 번갈아 들어갑니다. 각각 0~1000으로 정규화한 좌표입니다. */
  points: number[];
};

export type DrawChat = {
  id: number;
  playerId: string | null;
  kind: "chat" | "correct" | "system";
  text: string;
};

export type DrawView = {
  phase: "lobby" | "choose" | "draw" | "reveal" | "result";
  categories: { key: string; label: string }[];
  turn: number;
  totalTurns: number;
  drawerId: string | null;
  youAreDrawer: boolean;
  /** 그리는 사람에게만, 고르는 단계에서만 */
  choices: string[] | null;
  /** 그리는 사람과 이미 맞힌 사람에게, 그리고 공개 단계에서 모두에게 */
  word: string | null;
  /** 글자 수만 보이는 빈칸. 힌트가 열리면 초성으로 바뀝니다. */
  mask: string;
  deadline: number;
  totalMs: number;
  /** 이번 차례에 맞힌 사람과 얻은 점수 */
  guessed: Record<string, number>;
  drawerGain: number;
  scores: Record<string, number>;
  chat: DrawChat[];
};

export type LobbyView = {
  you: { id: string; name: string } | null;
  users: { id: string; name: string; room: { code: string; game: GameSlug } | null }[];
  rooms: {
    code: string;
    game: GameSlug;
    host: string;
    players: number;
    max: number;
    playing: boolean;
  }[];
};

type Base = {
  code: string;
  hostId: string;
  you: string;
  players: PlayerView[];
  serverNow: number;
};

export type RoomView =
  | (Base & { game: "draw"; state: DrawView })
  | (Base & { game: "chosung"; state: ChosungView })
  | (Base & { game: "liar"; state: LiarView })
  | (Base & { game: "typing"; state: TypingView })
  | (Base & { game: "wordchain"; state: WordChainView });

export type GameAction = { type: string; [key: string]: unknown };

export type { GameSlug };
