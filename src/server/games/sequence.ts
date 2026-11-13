import type { SequenceView } from "@/lib/types";
import { GameError, requireHost, shuffle, type Room } from "../rooms";
import type { GameModule } from "./index";
import { record, soloView, type SoloState } from "./solo";

const CARDS = 16;
const START_LENGTH = 2;
/** 카드 한 장이 뒤집혀 보이는 간격 */
const STEP_MS = 650;
/** 시작하거나 한 판을 성공한 뒤, 다음 순서를 보여 주기까지의 뜸 */
const LEAD_MS = 1_100;
/** 마지막 카드가 덮이고 나서 입력을 받기까지 */
const SETTLE_MS = 250;
/** 시계 오차로 조금 일찍 도착한 입력은 받아 줍니다. */
const EARLY_SLACK_MS = 200;

type State = SoloState & {
  phase: SequenceView["phase"];
  length: number;
  order: number[];
  showAt: number;
  inputAt: number;
  progress: number;
  cleared: number;
  miss: SequenceView["miss"];
};

function init(): State {
  return {
    phase: "lobby",
    length: START_LENGTH,
    order: [],
    showAt: 0,
    inputAt: 0,
    progress: 0,
    cleared: 0,
    miss: null,
    last: null,
  };
}

/** 순서는 판마다 새로 정합니다. 한 판 안에서 같은 카드는 한 번만 나옵니다. */
function deal(s: State): void {
  s.order = shuffle(Array.from({ length: CARDS }, (_, i) => i)).slice(0, s.length);
  s.progress = 0;
  s.showAt = Date.now() + LEAD_MS;
  s.inputAt = s.showAt + s.length * STEP_MS + SETTLE_MS;
}

function finish(room: Room, s: State): void {
  s.phase = "result";
  // 한 번도 성공하지 못한 판은 기록으로 남기지 않습니다.
  if (s.cleared >= START_LENGTH) record(room, s, "sequence", s.cleared);
  else s.last = null;
}

export const sequenceGame: GameModule = {
  init,
  handle(room, _player, action, isHost) {
    const s = room.state as State;
    if (action.type === "start") {
      requireHost(isHost);
      Object.assign(s, init(), { phase: "play" });
      deal(s);
      return;
    }
    if (action.type === "pick") {
      if (s.phase !== "play") return "quiet";
      // 순서를 보여 주는 동안에는 누를 수 없습니다.
      if (Date.now() < s.inputAt - EARLY_SLACK_MS) return "quiet";
      const index = Number(action.index);
      if (!Number.isInteger(index) || index < 0 || index >= CARDS) {
        throw new GameError("잘못된 카드입니다.");
      }
      // 이미 맞게 누른 카드를 다시 누른 것은 실수로 보지 않습니다.
      if (s.order.slice(0, s.progress).includes(index)) return "quiet";
      const expected = s.order[s.progress];
      if (index !== expected) {
        s.miss = { picked: index, expected };
        finish(room, s);
        return;
      }
      s.progress += 1;
      if (s.progress < s.length) return;
      s.cleared = s.length;
      if (s.length >= CARDS) {
        finish(room, s);
        return;
      }
      s.length += 1;
      deal(s);
      return;
    }
    throw new GameError("알 수 없는 동작입니다.");
  },
  view(room): SequenceView {
    const s = room.state as State;
    return {
      ...soloView(room, s, ["sequence"]),
      phase: s.phase,
      cards: CARDS,
      length: s.length,
      order: s.order,
      showAt: s.showAt,
      stepMs: STEP_MS,
      inputAt: s.inputAt,
      progress: s.progress,
      cleared: s.cleared,
      miss: s.miss,
    };
  },
};
