import { nextStarts } from "@/lib/hangul";
import type { WordChainView } from "@/lib/types";
import {
  GameError,
  clearRoomTimer,
  onlineIds,
  requireHost,
  setRoomTimer,
  shuffle,
  type Room,
} from "../rooms";
import type { GameModule } from "./index";

const MIN_PLAYERS = 2;
const MAX_LIVES = 3;
const TURN_CHOICES = [10, 15, 20];

type Entry = {
  word: string;
  playerId: string;
  /** 이 단어가 나오기 전의 시작 글자 조건. 무효 처리 때 되돌립니다. */
  startsBefore: string[] | null;
};

type State = {
  phase: WordChainView["phase"];
  order: string[];
  lives: Record<string, number>;
  turnIdx: number;
  chain: Entry[];
  used: Set<string>;
  starts: string[] | null;
  deadline: number;
  turnSeconds: number;
  objections: string[];
  lastEvent: WordChainView["lastEvent"];
  winnerId: string | null;
};

function init(): State {
  return {
    phase: "lobby",
    order: [],
    lives: {},
    turnIdx: 0,
    chain: [],
    used: new Set(),
    starts: null,
    deadline: 0,
    turnSeconds: 15,
    objections: [],
    lastEvent: null,
    winnerId: null,
  };
}

function alive(s: State): string[] {
  return s.order.filter((id) => s.lives[id] > 0);
}

function objectionsNeeded(s: State): number {
  const last = s.chain[s.chain.length - 1];
  if (!last) return 0;
  const others = alive(s).filter((id) => id !== last.playerId).length;
  return Math.floor(others / 2) + 1;
}

/** 승자가 정해졌으면 true */
function checkWinner(room: Room): boolean {
  const s = room.state as State;
  const left = alive(s);
  if (left.length > 1) return false;
  clearRoomTimer(room);
  s.phase = "result";
  s.winnerId = left[0] ?? null;
  return true;
}

function startTurn(room: Room): void {
  const s = room.state as State;
  s.deadline = Date.now() + s.turnSeconds * 1000;
  setRoomTimer(room, s.turnSeconds * 1000, () => {
    if (s.phase !== "play") return;
    const loser = s.order[s.turnIdx];
    s.lives[loser] -= 1;
    s.lastEvent = { type: "timeout", playerId: loser };
    // 이을 수 없는 글자에 다 같이 막히지 않도록, 다음 사람은 새 단어로 시작합니다.
    s.starts = null;
    s.objections = [];
    if (checkWinner(room)) return;
    advance(s);
    startTurn(room);
  });
}

function advance(s: State): void {
  for (let i = 0; i < s.order.length; i++) {
    s.turnIdx = (s.turnIdx + 1) % s.order.length;
    if (s.lives[s.order[s.turnIdx]] > 0) return;
  }
}

export const wordChainGame: GameModule = {
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
        Object.assign(s, init(), {
          phase: "play",
          order: shuffle(ids),
          lives: Object.fromEntries(ids.map((id) => [id, MAX_LIVES])),
          turnSeconds: TURN_CHOICES.includes(action.turnSeconds as number)
            ? (action.turnSeconds as number)
            : 15,
        });
        startTurn(room);
        return;
      }
      case "word": {
        if (s.phase !== "play") return;
        if (s.order[s.turnIdx] !== player.id) throw new GameError("내 차례가 아닙니다.");
        const word = typeof action.text === "string" ? action.text.trim() : "";
        if (!/^[가-힣]{2,10}$/.test(word)) {
          throw new GameError("한글 2~10글자 단어만 쓸 수 있습니다.");
        }
        if (s.starts && !s.starts.includes(word[0])) {
          throw new GameError(`'${s.starts.join("' 또는 '")}'(으)로 시작해야 합니다.`);
        }
        if (s.used.has(word)) throw new GameError("이미 나온 단어입니다.");
        s.used.add(word);
        s.chain.push({ word, playerId: player.id, startsBefore: s.starts });
        s.starts = nextStarts(word[word.length - 1]);
        s.objections = [];
        s.lastEvent = null;
        advance(s);
        startTurn(room);
        return;
      }
      case "object": {
        if (s.phase !== "play") return;
        const last = s.chain[s.chain.length - 1];
        // starts가 null이면 직전에 시간 초과로 끊긴 것이라 이의 제기 대상이 없습니다.
        if (!last || s.starts === null) throw new GameError("이의를 제기할 단어가 없습니다.");
        if (!(s.lives[player.id] > 0)) throw new GameError("탈락한 사람은 이의를 제기할 수 없습니다.");
        if (last.playerId === player.id) throw new GameError("자기 단어에는 이의를 제기할 수 없습니다.");
        if (s.objections.includes(player.id)) return;
        s.objections.push(player.id);
        if (s.objections.length < objectionsNeeded(s)) return;
        s.chain.pop();
        s.starts = last.startsBefore;
        s.lives[last.playerId] -= 1;
        s.lastEvent = { type: "rejected", playerId: last.playerId, word: last.word };
        s.objections = [];
        if (checkWinner(room)) return;
        // 차례였던 사람이 그대로 이어 갑니다. 탈락했다면 다음 사람으로 넘깁니다.
        if (!(s.lives[s.order[s.turnIdx]] > 0)) advance(s);
        startTurn(room);
        return;
      }
      default:
        throw new GameError("알 수 없는 동작입니다.");
    }
  },
  view(room): WordChainView {
    const s = room.state as State;
    return {
      phase: s.phase,
      order: s.order,
      lives: s.lives,
      maxLives: MAX_LIVES,
      turnId: s.phase === "play" ? s.order[s.turnIdx] : null,
      chain: s.chain.slice(-12).map(({ word, playerId }) => ({ word, playerId })),
      starts: s.starts,
      deadline: s.deadline,
      turnSeconds: s.turnSeconds,
      objections: s.objections,
      objectionsNeeded: objectionsNeeded(s),
      lastEvent: s.lastEvent,
      winnerId: s.winnerId,
    };
  },
};
