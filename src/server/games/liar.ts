import { normalize } from "@/lib/hangul";
import type { LiarView } from "@/lib/types";
import { CATEGORIES, CATEGORY_OPTIONS } from "../data/words";
import {
  GameError,
  clearRoomTimer,
  onlineIds,
  pick,
  requireHost,
  setRoomTimer,
  shuffle,
  type Room,
} from "../rooms";
import type { GameModule } from "./index";

const MIN_PLAYERS = 3;
const GUESS_MS = 30_000;

type State = {
  phase: LiarView["phase"];
  category: string;
  word: string;
  liarId: string;
  participants: string[];
  order: string[];
  votes: Record<string, string>;
  accusedId: string | null;
  liarGuess: string | null;
  winner: LiarView["winner"];
  deadline: number;
};

function init(): State {
  return {
    phase: "lobby",
    category: "",
    word: "",
    liarId: "",
    participants: [],
    order: [],
    votes: {},
    accusedId: null,
    liarGuess: null,
    winner: null,
    deadline: 0,
  };
}

function tally(room: Room): void {
  const s = room.state as State;
  const counts = new Map<string, number>();
  for (const target of Object.values(s.votes)) {
    counts.set(target, (counts.get(target) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const tied = ranked.length > 1 && ranked[0][1] === ranked[1][1];
  s.accusedId = ranked.length > 0 && !tied ? ranked[0][0] : null;
  if (s.accusedId === s.liarId) {
    // 지목된 라이어에게 제시어를 맞힐 마지막 기회를 줍니다.
    s.phase = "guess";
    s.deadline = Date.now() + GUESS_MS;
    setRoomTimer(room, GUESS_MS, () => {
      if (s.phase !== "guess") return;
      s.phase = "result";
      s.winner = "citizens";
    });
  } else {
    clearRoomTimer(room);
    s.phase = "result";
    s.winner = "liar";
  }
}

export const liarGame: GameModule = {
  init,
  handle(room, player, action, isHost) {
    const s = room.state as State;
    switch (action.type) {
      case "start": {
        requireHost(isHost);
        if (s.phase !== "lobby") throw new GameError("이미 진행 중입니다.");
        const ids = onlineIds(room);
        if (ids.length < MIN_PLAYERS) {
          throw new GameError(`${MIN_PLAYERS}명 이상 모여야 시작할 수 있습니다.`);
        }
        const category =
          CATEGORIES.find((c) => c.key === action.category) ?? pick(CATEGORIES);
        Object.assign(s, init(), {
          phase: "discuss",
          category: category.label,
          word: pick(category.words),
          liarId: pick(ids),
          participants: ids,
          order: shuffle(ids),
        });
        return;
      }
      case "startVote": {
        requireHost(isHost);
        if (s.phase !== "discuss") return;
        s.phase = "vote";
        s.votes = {};
        return;
      }
      case "vote": {
        if (s.phase !== "vote") return;
        if (!s.participants.includes(player.id)) {
          throw new GameError("이번 판 참가자만 투표할 수 있습니다.");
        }
        const target = action.target;
        if (typeof target !== "string" || !s.participants.includes(target)) {
          throw new GameError("투표할 사람을 골라 주세요.");
        }
        if (target === player.id) throw new GameError("자신에게는 투표할 수 없습니다.");
        s.votes[player.id] = target;
        const online = new Set(onlineIds(room));
        const waiting = s.participants.filter((id) => online.has(id) && !(id in s.votes));
        if (waiting.length === 0) tally(room);
        return;
      }
      case "closeVote": {
        requireHost(isHost);
        if (s.phase !== "vote") return;
        tally(room);
        return;
      }
      case "guess": {
        if (s.phase !== "guess") return;
        if (player.id !== s.liarId) throw new GameError("라이어만 답할 수 있습니다.");
        const text = typeof action.text === "string" ? action.text.trim().slice(0, 20) : "";
        if (!text) throw new GameError("제시어를 입력해 주세요.");
        clearRoomTimer(room);
        s.liarGuess = text;
        s.phase = "result";
        s.winner = normalize(text) === normalize(s.word) ? "liar" : "citizens";
        return;
      }
      default:
        throw new GameError("알 수 없는 동작입니다.");
    }
  },
  view(room, playerId): LiarView {
    const s = room.state as State;
    const done = s.phase === "result";
    const playing = s.participants.includes(playerId);
    const isLiar = playing && playerId === s.liarId;
    return {
      phase: s.phase,
      categories: CATEGORY_OPTIONS,
      category: s.category,
      participants: s.participants,
      order: s.order,
      youPlaying: playing,
      youAreLiar: isLiar,
      // 제시어는 시민에게만 보냅니다. 라이어와 관전자의 화면에는 아예 내려가지 않습니다.
      word: done || (playing && !isLiar) ? s.word || null : null,
      voted: Object.keys(s.votes),
      yourVote: s.votes[playerId] ?? null,
      votes: done ? s.votes : null,
      accusedId: s.phase === "guess" || done ? s.accusedId : null,
      liarId: s.phase === "guess" || done ? s.liarId : null,
      liarGuess: done ? s.liarGuess : null,
      winner: s.winner,
      deadline: s.deadline,
    };
  },
};
