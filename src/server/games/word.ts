import { JAMO_KEYS, toKeys } from "@/lib/hangul";
import type { Mark, WordView } from "@/lib/types";
import { NOUNS } from "../data/nouns";
import { CATEGORIES } from "../data/words";
import { GameError, clearRoomTimer, onlineIds, pick, requireHost, setRoomTimer, type Room } from "../rooms";
import type { GameModule } from "./index";

const MAX_TRIES = 6;
const PLAY_MS = 4 * 60_000;
const LENGTHS = [5, 6];

/** 글쇠 수별 정답 후보. 서버가 켜질 때 한 번 만들어 둡니다. */
const POOL = new Map<number, string[]>();
for (const word of new Set([...NOUNS, ...CATEGORIES.flatMap((c) => c.words)])) {
  const n = toKeys(word).length;
  if (LENGTHS.includes(n)) POOL.set(n, [...(POOL.get(n) ?? []), word]);
}

type Row = { keys: string[]; marks: Mark[] };
type Board = { rows: Row[]; solvedMs: number | null; done: boolean };

type State = {
  phase: WordView["phase"];
  length: number;
  answer: string;
  answerKeys: string[];
  startAt: number;
  deadline: number;
  participants: string[];
  boards: Record<string, Board>;
};

function init(): State {
  return {
    phase: "lobby",
    length: 5,
    answer: "",
    answerKeys: [],
    startAt: 0,
    deadline: 0,
    participants: [],
    boards: {},
  };
}

/** 같은 글쇠가 여러 번 나올 때를 맞게 처리하려고, 자리까지 맞은 것부터 먼저 셉니다. */
export function mark(answer: string[], guess: string[]): Mark[] {
  const marks: Mark[] = guess.map(() => "miss");
  const left = new Map<string, number>();
  answer.forEach((key, i) => {
    if (guess[i] === key) marks[i] = "hit";
    else left.set(key, (left.get(key) ?? 0) + 1);
  });
  guess.forEach((key, i) => {
    if (marks[i] === "hit") return;
    const n = left.get(key) ?? 0;
    if (n > 0) {
      marks[i] = "near";
      left.set(key, n - 1);
    }
  });
  return marks;
}

function finishIfDone(room: Room): void {
  const s = room.state as State;
  const online = new Set(onlineIds(room));
  if (s.participants.some((id) => online.has(id) && !s.boards[id].done)) return;
  clearRoomTimer(room);
  s.phase = "result";
}

export const wordGame: GameModule = {
  init,
  handle(room, player, action, isHost) {
    const s = room.state as State;
    if (action.type === "start") {
      requireHost(isHost);
      if (s.phase !== "lobby") throw new GameError("이미 진행 중입니다.");
      const length = LENGTHS.includes(action.length as number) ? (action.length as number) : 5;
      const answer = pick(POOL.get(length) ?? []);
      const ids = onlineIds(room);
      Object.assign(s, init(), {
        phase: "play",
        length,
        answer,
        answerKeys: toKeys(answer),
        startAt: Date.now(),
        deadline: Date.now() + PLAY_MS,
        participants: ids,
        boards: Object.fromEntries(ids.map((id) => [id, { rows: [], solvedMs: null, done: false }])),
      });
      setRoomTimer(room, PLAY_MS, () => {
        s.phase = "result";
      });
      return;
    }
    if (action.type === "guess") {
      const board = s.boards[player.id];
      if (s.phase !== "play" || !board || board.done) return;
      const keys = action.keys;
      if (
        !Array.isArray(keys) ||
        keys.length !== s.length ||
        !keys.every((k) => typeof k === "string" && k.length === 1 && JAMO_KEYS.includes(k))
      ) {
        throw new GameError(`${s.length}칸을 모두 채워 주세요.`);
      }
      const marks = mark(s.answerKeys, keys as string[]);
      board.rows.push({ keys: keys as string[], marks });
      if (marks.every((m) => m === "hit")) {
        board.solvedMs = Date.now() - s.startAt;
        board.done = true;
      } else if (board.rows.length >= MAX_TRIES) {
        board.done = true;
      }
      finishIfDone(room);
      return;
    }
    throw new GameError("알 수 없는 동작입니다.");
  },
  view(room, playerId): WordView {
    const s = room.state as State;
    const over = s.phase === "result";
    const boards: WordView["boards"] = {};
    for (const [id, board] of Object.entries(s.boards)) {
      // 남의 판은 색만 보여 줍니다. 글쇠까지 보이면 답을 베낄 수 있습니다.
      const showKeys = over || id === playerId;
      boards[id] = {
        rows: board.rows.map((row) => ({ keys: showKeys ? row.keys : null, marks: row.marks })),
        solvedMs: board.solvedMs,
        done: board.done,
      };
    }
    return {
      phase: s.phase,
      length: s.length,
      maxTries: MAX_TRIES,
      deadline: s.deadline,
      totalMs: PLAY_MS,
      participants: s.participants,
      boards,
      answer: over || s.boards[playerId]?.done ? s.answer || null : null,
    };
  },
};

export const WORD_POOL_SIZES = Object.fromEntries([...POOL].map(([n, words]) => [n, words.length]));
