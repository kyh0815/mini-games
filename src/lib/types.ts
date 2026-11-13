import type { GameSlug } from "./games";
import type { BoardRows } from "./records";

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
  /** 그리는 사람에게, 그리고 공개 단계에서 모두에게 */
  word: string | null;
  /** 글자 수만 보이는 빈칸. 힌트가 열리면 초성으로 바뀝니다. */
  mask: string;
  deadline: number;
  totalMs: number;
  /** 이번 차례에 맞힌 사람과 얻은 점수. 먼저 맞힌 한 명뿐입니다. */
  guessed: Record<string, number>;
  drawerGain: number;
  scores: Record<string, number>;
  chat: DrawChat[];
};

export type BaseballView = {
  phase: "lobby" | "setup" | "play" | "result";
  digits: number;
  /** 겨루는 두 사람 */
  players: string[];
  youPlaying: boolean;
  /** 내가 정한 숫자. 결과 단계에서는 secrets로 모두 공개됩니다. */
  yourSecret: string | null;
  /** 숫자를 정한 사람 */
  ready: string[];
  turnId: string | null;
  guesses: { playerId: string; guess: string; strike: number; ball: number }[];
  /** 먼저 시작한 사람이 맞혀서, 상대에게 마지막 기회가 주어진 상태 */
  lastChance: boolean;
  deadline: number;
  totalMs: number;
  winnerId: string | null;
  secrets: Record<string, string> | null;
};

/** 칸 하나의 판정: 자리까지 맞음 / 다른 자리에 있음 / 없음 */
export type Mark = "hit" | "near" | "miss";

export type WordView = {
  phase: "lobby" | "play" | "result";
  length: number;
  maxTries: number;
  deadline: number;
  totalMs: number;
  participants: string[];
  /** 내 줄은 글자까지, 남의 줄은 판정만 보입니다. */
  boards: Record<
    string,
    { rows: { keys: string[] | null; marks: Mark[] }[]; solvedMs: number | null; done: boolean }
  >;
  /** 결과 단계에서, 또는 내가 끝낸 뒤에 공개 */
  answer: string | null;
};

export type SnakeView = {
  phase: "lobby" | "play" | "result";
  width: number;
  height: number;
  startAt: number;
  deadline: number;
  /** 몸통은 x, y가 번갈아 들어가며 머리가 맨 앞입니다. */
  snakes: { id: string; body: number[]; alive: boolean; score: number }[];
  foods: number[];
  winnerId: string | null;
};

type SoloView = {
  /** 이 게임의 순위표들 */
  boards: BoardRows[];
  /** 방금 끝낸 판의 순위와, 개인 최고 기록을 새로 썼는지 */
  last: { board: string; value: number; rank: number; best: boolean } | null;
};

export type MemoryView = SoloView & {
  phase: "lobby" | "play" | "result";
  level: "easy" | "normal" | "hard";
  cols: number;
  /** 보이는 카드만 그림 번호가 들어 있습니다. */
  faces: (number | null)[];
  matched: boolean[];
  moves: number;
  /** 첫 카드를 뒤집은 시각. 아직이면 0 */
  startAt: number;
  finishedMs: number | null;
};

export type ReactionView = SoloView & {
  phase: "lobby" | "wait" | "go" | "early" | "between" | "result";
  round: number;
  rounds: number;
  times: number[];
  average: number | null;
};

export type AimView = SoloView & {
  phase: "lobby" | "play" | "result";
  startAt: number;
  deadline: number;
  /** x, y가 번갈아 들어갑니다. 0~1000으로 정규화한 좌표입니다. */
  targets: number[];
  hits: number;
  misses: number;
};

export type StairsView = SoloView & {
  phase: "lobby" | "play" | "result";
  startAt: number;
  /** 계단 방향을 L/R로 이어 붙인 문자열 */
  steps: string;
  climbed: number;
};

export type LobbyView = {
  you: { id: string; name: string } | null;
  users: {
    id: string;
    name: string;
    /** joinable이 false면 혼자 하는 게임이라 따라 들어갈 수 없습니다. */
    room: { code: string; game: GameSlug; joinable: boolean } | null;
  }[];
  rooms: {
    code: string;
    game: GameSlug;
    host: string;
    players: number;
    max: number;
    playing: boolean;
    /** 비밀번호가 걸린 방 */
    locked: boolean;
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
  | (Base & { game: "baseball"; state: BaseballView })
  | (Base & { game: "word"; state: WordView })
  | (Base & { game: "snake"; state: SnakeView })
  | (Base & { game: "memory"; state: MemoryView })
  | (Base & { game: "reaction"; state: ReactionView })
  | (Base & { game: "aim"; state: AimView })
  | (Base & { game: "stairs"; state: StairsView })
  | (Base & { game: "draw"; state: DrawView })
  | (Base & { game: "chosung"; state: ChosungView })
  | (Base & { game: "liar"; state: LiarView })
  | (Base & { game: "typing"; state: TypingView })
  | (Base & { game: "wordchain"; state: WordChainView });

export type GameAction = { type: string; [key: string]: unknown };

export type { GameSlug };
