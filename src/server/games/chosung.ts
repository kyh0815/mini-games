import { chosung, normalize } from "@/lib/hangul";
import type { ChosungView } from "@/lib/types";
import { CATEGORIES, CATEGORY_OPTIONS } from "../data/words";
import { GameError, requireHost, setRoomTimer, shuffle, type Room } from "../rooms";
import type { GameModule } from "./index";

const HINT_AFTER_MS = 10_000;
const QUESTION_MS = 20_000;
const REVEAL_MS = 3_500;
const ROUND_CHOICES = [5, 10, 15];

/** accepts: 같은 주제에서 초성이 같은 단어들. 모두 정답으로 인정합니다. */
type Question = { category: string; answer: string; accepts: string[] };

type State = {
  phase: ChosungView["phase"];
  queue: Question[];
  round: number;
  totalRounds: number;
  current: Question | null;
  hint: string | null;
  winnerId: string | null;
  deadline: number;
  scores: Record<string, number>;
  guesses: { playerId: string; text: string }[];
};

function init(): State {
  return {
    phase: "lobby",
    queue: [],
    round: 0,
    totalRounds: 0,
    current: null,
    hint: null,
    winnerId: null,
    deadline: 0,
    scores: {},
    guesses: [],
  };
}

function nextQuestion(room: Room): void {
  const s = room.state as State;
  const next = s.queue.shift();
  if (!next) {
    s.phase = "result";
    s.current = null;
    return;
  }
  s.phase = "question";
  s.round += 1;
  s.current = next;
  s.hint = null;
  s.winnerId = null;
  s.guesses = [];
  s.deadline = Date.now() + QUESTION_MS;
  const round = s.round;
  setRoomTimer(room, HINT_AFTER_MS, () => {
    if (s.phase !== "question" || s.round !== round) return;
    s.hint = Array.from(next.answer)[0];
    setRoomTimer(room, QUESTION_MS - HINT_AFTER_MS, () => {
      if (s.phase === "question" && s.round === round) reveal(room, null);
    });
  });
}

function reveal(room: Room, winnerId: string | null): void {
  const s = room.state as State;
  s.phase = "reveal";
  s.winnerId = winnerId;
  s.deadline = Date.now() + REVEAL_MS;
  setRoomTimer(room, REVEAL_MS, () => nextQuestion(room));
}

export const chosungGame: GameModule = {
  init,
  handle(room, player, action, isHost) {
    const s = room.state as State;
    if (action.type === "start") {
      requireHost(isHost);
      if (s.phase !== "lobby") throw new GameError("이미 진행 중입니다.");
      const rounds = ROUND_CHOICES.includes(action.rounds as number)
        ? (action.rounds as number)
        : 10;
      const chosen = CATEGORIES.filter(
        (c) => action.category === "all" || c.key === action.category,
      );
      const pool = (chosen.length > 0 ? chosen : CATEGORIES).flatMap((c) =>
        c.words.map((answer) => ({
          category: c.label,
          answer,
          accepts: c.words.filter((w) => chosung(w) === chosung(answer)).map(normalize),
        })),
      );
      s.queue = shuffle(pool).slice(0, rounds);
      s.totalRounds = s.queue.length;
      s.round = 0;
      s.scores = {};
      nextQuestion(room);
      return;
    }
    if (action.type === "answer") {
      if (s.phase !== "question" || !s.current) return;
      const text = typeof action.text === "string" ? action.text.trim().slice(0, 20) : "";
      if (!text) return;
      if (s.current.accepts.includes(normalize(text))) {
        // 초성이 같은 다른 단어로 맞혔다면 그 단어를 정답으로 보여 줍니다.
        s.current = { ...s.current, answer: text };
        s.scores[player.id] = (s.scores[player.id] ?? 0) + 1;
        reveal(room, player.id);
      } else {
        s.guesses = [...s.guesses, { playerId: player.id, text }].slice(-6);
      }
      return;
    }
    throw new GameError("알 수 없는 동작입니다.");
  },
  view(room): ChosungView {
    const s = room.state as State;
    return {
      phase: s.phase,
      categories: CATEGORY_OPTIONS,
      round: s.round,
      totalRounds: s.totalRounds,
      category: s.current?.category ?? "",
      chosung: s.current ? chosung(s.current.answer) : "",
      hint: s.phase === "question" ? s.hint : null,
      answer: s.phase === "reveal" ? (s.current?.answer ?? null) : null,
      winnerId: s.winnerId,
      deadline: s.deadline,
      scores: s.scores,
      guesses: s.guesses,
    };
  },
};
