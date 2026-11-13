import { DRAW_COLORS, PAPER, PEN_SIZE, SIZE_MAX, SIZE_MIN } from "@/lib/draw";
import { chosung, normalize } from "@/lib/hangul";
import type { DrawChat, DrawView, Stroke } from "@/lib/types";
import { CATEGORIES, CATEGORY_OPTIONS } from "../data/words";
import {
  GameError,
  clearRoomTimer,
  emit,
  onlineIds,
  requireHost,
  setRoomTimer,
  shuffle,
  type Room,
} from "../rooms";
import type { GameModule } from "./index";

const MIN_PLAYERS = 2;
const CHOOSE_MS = 12_000;
const REVEAL_MS = 5_000;
const DRAW_SECONDS = [60, 80, 100];
const CYCLES = [1, 2, 3];

// 지우개는 종이색으로 그리는 굵은 펜입니다.
const ALLOWED_COLORS = [...DRAW_COLORS, PAPER];

const MAX_STROKES = 1500;
const MAX_POINTS = 60_000;
const MAX_BATCH = 512;
const MAX_CHAT = 40;

type State = {
  phase: DrawView["phase"];
  order: string[];
  turn: number;
  totalTurns: number;
  drawSeconds: number;
  pool: string[];
  drawerId: string | null;
  choices: string[];
  word: string;
  hinted: boolean;
  deadline: number;
  totalMs: number;
  guessed: Record<string, number>;
  drawerGain: number;
  scores: Record<string, number>;
  strokes: Stroke[];
  pointCount: number;
  chat: DrawChat[];
  chatSeq: number;
};

function init(): State {
  return {
    phase: "lobby",
    order: [],
    turn: 0,
    totalTurns: 0,
    drawSeconds: 80,
    pool: [],
    drawerId: null,
    choices: [],
    word: "",
    hinted: false,
    deadline: 0,
    totalMs: 0,
    guessed: {},
    drawerGain: 0,
    scores: {},
    strokes: [],
    pointCount: 0,
    chat: [],
    chatSeq: 0,
  };
}

function say(s: State, kind: DrawChat["kind"], text: string, playerId: string | null = null): void {
  s.chat = [...s.chat, { id: ++s.chatSeq, playerId, kind, text }].slice(-MAX_CHAT);
}

function clearCanvas(room: Room): void {
  const s = room.state as State;
  s.strokes = [];
  s.pointCount = 0;
  emit(room, "canvas", []);
}

function nextTurn(room: Room): void {
  const s = room.state as State;
  if (s.turn >= s.totalTurns) {
    clearRoomTimer(room);
    s.phase = "result";
    s.drawerId = null;
    return;
  }
  // 접속이 끊긴 사람의 차례는 건너뜁니다.
  const online = new Set(onlineIds(room));
  let drawer: string | null = null;
  while (s.turn < s.totalTurns && !drawer) {
    const candidate = s.order[s.turn % s.order.length];
    s.turn += 1;
    if (online.has(candidate)) drawer = candidate;
  }
  if (!drawer) {
    s.phase = "result";
    s.drawerId = null;
    return;
  }
  s.phase = "choose";
  s.drawerId = drawer;
  s.choices = s.pool.splice(0, 3);
  s.word = "";
  s.hinted = false;
  s.guessed = {};
  s.drawerGain = 0;
  s.deadline = Date.now() + CHOOSE_MS;
  s.totalMs = CHOOSE_MS;
  clearCanvas(room);
  setRoomTimer(room, CHOOSE_MS, () => {
    if (s.phase === "choose") startDrawing(room, 0);
  });
}

function startDrawing(room: Room, index: number): void {
  const s = room.state as State;
  s.word = s.choices[index] ?? s.choices[0];
  s.phase = "draw";
  s.totalMs = s.drawSeconds * 1000;
  s.deadline = Date.now() + s.totalMs;
  const turn = s.turn;
  // 절반이 지나면 초성 힌트를 열고, 나머지 절반 뒤에 차례를 끝냅니다.
  setRoomTimer(room, s.totalMs / 2, () => {
    if (s.phase !== "draw" || s.turn !== turn) return;
    s.hinted = true;
    setRoomTimer(room, s.totalMs / 2, () => {
      if (s.phase === "draw" && s.turn === turn) endTurn(room, true);
    });
  });
}

function endTurn(room: Room, timedOut: boolean): void {
  const s = room.state as State;
  s.phase = "reveal";
  s.deadline = Date.now() + REVEAL_MS;
  s.totalMs = REVEAL_MS;
  if (timedOut) say(s, "system", `시간 종료. 정답은 '${s.word}'`);
  setRoomTimer(room, REVEAL_MS, () => nextTurn(room));
}

function mask(word: string, hinted: boolean): string {
  return Array.from(hinted ? chosung(word) : word)
    .map((ch) => (ch === " " ? " " : hinted ? ch : "_"))
    .join("");
}

function validPoints(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > MAX_BATCH || raw.length % 2 !== 0) {
    return null;
  }
  const out: number[] = [];
  for (const value of raw) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    out.push(Math.max(0, Math.min(1000, Math.round(value))));
  }
  return out;
}

export const drawGame: GameModule = {
  init,
  onSubscribe(room, send) {
    send("canvas", (room.state as State).strokes);
  },
  handle(room, player, action, isHost) {
    const s = room.state as State;
    const isDrawer = s.drawerId === player.id;
    switch (action.type) {
      case "start": {
        requireHost(isHost);
        if (s.phase !== "lobby") throw new GameError("이미 진행 중입니다.");
        const ids = onlineIds(room);
        if (ids.length < MIN_PLAYERS) {
          throw new GameError(`${MIN_PLAYERS}명 이상 모여야 시작할 수 있습니다.`);
        }
        const cycles = CYCLES.includes(action.cycles as number) ? (action.cycles as number) : 1;
        const chosen = CATEGORIES.filter(
          (c) => action.category === "all" || c.key === action.category,
        );
        Object.assign(s, init(), {
          order: shuffle(ids),
          totalTurns: ids.length * cycles,
          drawSeconds: DRAW_SECONDS.includes(action.drawSeconds as number)
            ? (action.drawSeconds as number)
            : 80,
          pool: shuffle((chosen.length > 0 ? chosen : CATEGORIES).flatMap((c) => c.words)),
          scores: Object.fromEntries(ids.map((id) => [id, 0])),
        });
        nextTurn(room);
        return;
      }
      case "choose": {
        if (s.phase !== "choose" || !isDrawer) return;
        const index = Number(action.index);
        if (!Number.isInteger(index) || index < 0 || index >= s.choices.length) {
          throw new GameError("단어를 골라 주세요.");
        }
        startDrawing(room, index);
        return;
      }
      case "stroke": {
        if (s.phase !== "draw" || !isDrawer) return "quiet";
        const points = validPoints(action.points);
        const id = typeof action.id === "string" ? action.id.slice(0, 16) : "";
        if (!points || !id) return "quiet";
        if (s.pointCount + points.length > MAX_POINTS) return "quiet";
        const last = s.strokes[s.strokes.length - 1];
        if (last && last.id === id) {
          last.points.push(...points);
        } else {
          if (s.strokes.length >= MAX_STROKES) return "quiet";
          const color = ALLOWED_COLORS.includes(action.color as string)
            ? (action.color as string)
            : DRAW_COLORS[0];
          const rawSize = action.size;
          const size =
            typeof rawSize === "number" && rawSize >= SIZE_MIN && rawSize <= SIZE_MAX
              ? Math.round(rawSize)
              : PEN_SIZE;
          s.strokes.push({ id, color, size, points: [...points] });
        }
        s.pointCount += points.length;
        const stroke = s.strokes[s.strokes.length - 1];
        emit(room, "stroke", { id, color: stroke.color, size: stroke.size, points }, player.id);
        return "quiet";
      }
      case "undo": {
        if (s.phase !== "draw" || !isDrawer) return "quiet";
        const removed = s.strokes.pop();
        if (removed) s.pointCount -= removed.points.length;
        emit(room, "canvas", s.strokes);
        return "quiet";
      }
      case "clear": {
        if (s.phase !== "draw" || !isDrawer) return "quiet";
        clearCanvas(room);
        return "quiet";
      }
      case "guess": {
        const text = typeof action.text === "string" ? action.text.trim().slice(0, 30) : "";
        if (!text) return "quiet";
        if (s.phase !== "draw") {
          say(s, "chat", text, player.id);
          return;
        }
        // 답을 아는 사람이 채팅으로 알려 주지 못하게 막습니다.
        if (isDrawer) throw new GameError("그리는 사람은 채팅할 수 없습니다.");
        // 입력한 말은 맞든 틀리든 그대로 채팅에 남깁니다.
        say(s, "chat", text, player.id);
        // 띄어쓰기와 대소문자만 무시하고, 글자가 전부 같아야 정답입니다.
        if (normalize(text) !== normalize(s.word)) return;
        const left = Math.max(0, s.deadline - Date.now()) / s.totalMs;
        const points = 40 + Math.round(60 * left);
        s.guessed = { [player.id]: points };
        s.scores[player.id] = (s.scores[player.id] ?? 0) + points;
        if (s.drawerId) {
          // 빨리 알아보게 그릴수록 그린 사람도 많이 받습니다.
          s.drawerGain = Math.round(points / 2);
          s.scores[s.drawerId] = (s.scores[s.drawerId] ?? 0) + s.drawerGain;
        }
        say(s, "correct", `${player.name} 님 정답! +${points}점`, player.id);
        // 누군가 맞히면 그 차례는 바로 끝납니다.
        endTurn(room, false);
        return;
      }
      default:
        throw new GameError("알 수 없는 동작입니다.");
    }
  },
  view(room, playerId): DrawView {
    const s = room.state as State;
    const isDrawer = s.drawerId === playerId;
    const knows = isDrawer || s.phase === "reveal";
    const active = s.phase === "draw" || s.phase === "reveal";
    return {
      phase: s.phase,
      categories: CATEGORY_OPTIONS,
      turn: s.turn,
      totalTurns: s.totalTurns,
      drawerId: s.drawerId,
      youAreDrawer: isDrawer,
      choices: s.phase === "choose" && isDrawer ? s.choices : null,
      // 제시어는 알아도 되는 사람에게만 보냅니다.
      word: active && knows ? s.word : null,
      mask: active ? mask(s.word, s.hinted || s.phase === "reveal") : "",
      deadline: s.deadline,
      totalMs: s.totalMs,
      guessed: s.guessed,
      drawerGain: s.drawerGain,
      scores: s.scores,
      chat: s.chat,
    };
  },
};
