import type { MemoryView } from "@/lib/types";
import { GameError, clearRoomTimer, requireHost, setRoomTimer, shuffle } from "../rooms";
import type { GameModule } from "./index";
import { record, soloView, type SoloState } from "./solo";

const LEVELS = {
  easy: { cols: 4, pairs: 8 },
  normal: { cols: 6, pairs: 12 },
  hard: { cols: 6, pairs: 18 },
} as const;
type Level = keyof typeof LEVELS;
const BOARD_KEYS = ["memory-easy", "memory-normal", "memory-hard"];
/** 틀린 두 장을 보여 주는 시간 */
const SHOW_MS = 800;

type State = SoloState & {
  phase: MemoryView["phase"];
  level: Level;
  cards: number[];
  matched: boolean[];
  /** 지금 앞면이 보이는, 아직 짝이 안 맞은 카드 */
  open: number[];
  moves: number;
  startAt: number;
  finishedMs: number | null;
};

function init(): State {
  return {
    phase: "lobby",
    level: "easy",
    cards: [],
    matched: [],
    open: [],
    moves: 0,
    startAt: 0,
    finishedMs: null,
    last: null,
  };
}

export const memoryGame: GameModule = {
  init,
  handle(room, _player, action, isHost) {
    const s = room.state as State;
    if (action.type === "start") {
      requireHost(isHost);
      const level = (Object.keys(LEVELS) as Level[]).find((l) => l === action.level) ?? "easy";
      const { pairs } = LEVELS[level];
      const symbols = Array.from({ length: pairs }, (_, i) => i);
      Object.assign(s, init(), {
        phase: "play",
        level,
        cards: shuffle([...symbols, ...symbols]),
        matched: Array(pairs * 2).fill(false),
      });
      clearRoomTimer(room);
      return;
    }
    if (action.type === "flip") {
      if (s.phase !== "play") return;
      const index = Number(action.index);
      if (!Number.isInteger(index) || index < 0 || index >= s.cards.length) {
        throw new GameError("잘못된 카드입니다.");
      }
      if (s.matched[index] || s.open.includes(index)) return;
      // 틀린 두 장이 아직 보이는 중에 다음 카드를 누르면 바로 덮고 진행합니다.
      if (s.open.length === 2) {
        clearRoomTimer(room);
        s.open = [];
      }
      if (s.startAt === 0) s.startAt = Date.now();
      s.open.push(index);
      if (s.open.length < 2) return;
      s.moves += 1;
      const [a, b] = s.open;
      if (s.cards[a] !== s.cards[b]) {
        setRoomTimer(room, SHOW_MS, () => {
          s.open = [];
        });
        return;
      }
      s.matched[a] = true;
      s.matched[b] = true;
      s.open = [];
      if (s.matched.every(Boolean)) {
        s.finishedMs = Date.now() - s.startAt;
        s.phase = "result";
        record(room, s, `memory-${s.level}`, s.finishedMs, `${s.moves}번 뒤집음`);
      }
      return;
    }
    throw new GameError("알 수 없는 동작입니다.");
  },
  view(room): MemoryView {
    const s = room.state as State;
    return {
      ...soloView(s, BOARD_KEYS),
      phase: s.phase,
      level: s.level,
      cols: LEVELS[s.level].cols,
      // 뒤집히지 않은 카드의 그림은 보내지 않습니다.
      faces: s.cards.map((card, i) => (s.matched[i] || s.open.includes(i) ? card : null)),
      matched: s.matched,
      moves: s.moves,
      startAt: s.startAt,
      finishedMs: s.finishedMs,
    };
  },
};
