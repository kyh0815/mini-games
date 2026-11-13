import { strokes } from "@/lib/hangul";
import type { TypingView } from "@/lib/types";
import { LONG_SENTENCES, SHORT_SENTENCES } from "../data/sentences";
import { GameError, clearRoomTimer, onlineIds, pick, requireHost, setRoomTimer, type Room } from "../rooms";
import type { GameModule } from "./index";

const COUNTDOWN_MS = 4_000;
const RACE_LIMIT_MS = 120_000;

type State = {
  phase: TypingView["phase"];
  text: string;
  startAt: number;
  deadline: number;
  participants: string[];
  progress: TypingView["progress"];
};

function init(): State {
  return { phase: "lobby", text: "", startAt: 0, deadline: 0, participants: [], progress: {} };
}

function finishIfDone(room: Room): void {
  const s = room.state as State;
  const online = new Set(onlineIds(room));
  const racing = s.participants.filter(
    (id) => online.has(id) && s.progress[id].finishedMs === null,
  );
  // 마지막 한 명을 무한정 기다리지 않도록, 모두 끝나면 바로 결과로 넘어갑니다.
  if (racing.length === 0) {
    s.phase = "result";
    clearRoomTimer(room);
  }
}

export const typingGame: GameModule = {
  init,
  handle(room, player, action, isHost) {
    const s = room.state as State;
    switch (action.type) {
      case "start": {
        requireHost(isHost);
        if (s.phase !== "lobby") throw new GameError("이미 진행 중입니다.");
        const ids = onlineIds(room);
        s.text = pick(action.length === "long" ? LONG_SENTENCES : SHORT_SENTENCES);
        s.participants = ids;
        s.progress = Object.fromEntries(ids.map((id) => [id, { chars: 0, finishedMs: null }]));
        s.startAt = Date.now() + COUNTDOWN_MS;
        s.deadline = s.startAt + RACE_LIMIT_MS;
        s.phase = "race";
        // 카운트다운이 끝나는 순간 문장을 공개하기 위해 한 번 더 내려보냅니다.
        setRoomTimer(room, COUNTDOWN_MS, () => {
          setRoomTimer(room, RACE_LIMIT_MS, () => {
            s.phase = "result";
          });
        });
        return;
      }
      case "progress": {
        const mine = s.progress[player.id];
        if (s.phase !== "race" || !mine || mine.finishedMs !== null) return;
        if (Date.now() < s.startAt) return;
        const chars = Number(action.chars);
        if (!Number.isInteger(chars)) return;
        // 완주는 finish에서 전체 문장을 검증한 뒤에만 인정합니다.
        mine.chars = Math.max(0, Math.min(chars, s.text.length - 1));
        return;
      }
      case "finish": {
        const mine = s.progress[player.id];
        if (s.phase !== "race" || !mine || mine.finishedMs !== null) return;
        const elapsed = Date.now() - s.startAt;
        if (elapsed <= 0) return;
        if (action.typed !== s.text) throw new GameError("문장이 정확히 일치하지 않습니다.");
        mine.chars = s.text.length;
        mine.finishedMs = elapsed;
        finishIfDone(room);
        return;
      }
      default:
        throw new GameError("알 수 없는 동작입니다.");
    }
  },
  view(room): TypingView {
    const s = room.state as State;
    // 카운트다운 동안에는 문장을 숨겨 미리 읽거나 입력할 수 없게 합니다.
    const text = s.phase === "race" && Date.now() < s.startAt ? "" : s.text;
    return {
      phase: s.phase,
      text,
      strokes: strokes(text),
      startAt: s.startAt,
      deadline: s.deadline,
      participants: s.participants,
      progress: s.progress,
    };
  },
};
