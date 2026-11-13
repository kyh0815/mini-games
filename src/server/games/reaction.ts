import { randomInt } from "node:crypto";
import type { ReactionView } from "@/lib/types";
import { GameError, clearRoomTimer, requireHost, setRoomTimer, type Room } from "../rooms";
import type { GameModule } from "./index";
import { record, soloView, type SoloState } from "./solo";

const ROUNDS = 5;
/** 사람이 낼 수 있는 가장 빠른 반응보다 짧으면 미리 누른 것으로 봅니다. */
const MIN_HUMAN_MS = 80;
const TOO_SLOW_MS = 3_000;

type State = SoloState & {
  phase: ReactionView["phase"];
  round: number;
  times: number[];
  goAt: number;
  average: number | null;
};

function init(): State {
  return { phase: "lobby", round: 0, times: [], goAt: 0, average: null, last: null };
}

function arm(room: Room): void {
  const s = room.state as State;
  s.phase = "wait";
  // 신호까지의 시간은 매번 달라서 리듬으로 맞힐 수 없습니다.
  setRoomTimer(room, 1_500 + randomInt(3_000), () => {
    s.phase = "go";
    s.goAt = Date.now();
    setRoomTimer(room, TOO_SLOW_MS, () => falseStart(room));
  });
}

/** 미리 눌렀거나 너무 늦은 경우: 같은 회차를 다시 합니다. */
function falseStart(room: Room): void {
  const s = room.state as State;
  s.phase = "early";
  setRoomTimer(room, 1_400, () => arm(room));
}

export const reactionGame: GameModule = {
  init,
  handle(room, _player, action, isHost) {
    const s = room.state as State;
    if (action.type === "start") {
      requireHost(isHost);
      Object.assign(s, init(), { round: 1 });
      arm(room);
      return;
    }
    if (action.type === "tap") {
      if (s.phase === "wait") {
        clearRoomTimer(room);
        falseStart(room);
        return;
      }
      if (s.phase !== "go") return;
      // 반응 시간은 화면이 바뀐 순간부터 각자 기기에서 잽니다(통신 지연이 섞이지 않도록).
      // 다만 서버가 신호를 보낸 뒤 흐른 시간보다 짧을 수는 없습니다.
      const elapsed = Date.now() - s.goAt;
      const claimed = Number(action.ms);
      const ms = Math.min(elapsed, Number.isFinite(claimed) ? Math.round(claimed) : elapsed);
      if (ms < MIN_HUMAN_MS) {
        clearRoomTimer(room);
        falseStart(room);
        return;
      }
      s.times.push(ms);
      s.phase = "between";
      setRoomTimer(room, 1_200, () => {
        if (s.times.length < ROUNDS) {
          s.round += 1;
          arm(room);
          return;
        }
        s.average = Math.round(s.times.reduce((a, b) => a + b, 0) / s.times.length);
        s.phase = "result";
        record(room, s, "reaction", s.average, `최고 ${Math.min(...s.times)}ms`);
      });
      return;
    }
    throw new GameError("알 수 없는 동작입니다.");
  },
  view(room): ReactionView {
    const s = room.state as State;
    return {
      ...soloView(room, s, ["reaction"]),
      phase: s.phase,
      round: s.round,
      rounds: ROUNDS,
      times: s.times,
      average: s.average,
    };
  },
};
