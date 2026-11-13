import { audio } from "@/lib/audio";
import type { RoomView } from "@/lib/types";

/** 직전 상태와 새 상태를 비교해 어울리는 효과음을 냅니다. */
export function roomSfx(prev: RoomView | null, next: RoomView): void {
  if (!prev || prev.code !== next.code) return;
  const me = next.you;
  const from = prev.state.phase;
  const to = next.state.phase;

  if (next.players.length > prev.players.length) audio.play("join");
  if (from === "lobby" && to !== "lobby") audio.play("start");

  if (next.game === "chosung" && prev.game === "chosung") {
    const a = prev.state;
    const b = next.state;
    if (a.phase === "question" && b.phase === "reveal") {
      audio.play(b.winnerId === me ? "correct" : b.winnerId ? "blip" : "wrong");
    } else if (b.phase === "question" && b.round !== a.round) {
      audio.play("turn");
    } else if (b.guesses.length > a.guesses.length) {
      audio.play("blip");
    }
    if (from !== "result" && to === "result") {
      const best = Math.max(0, ...Object.values(b.scores));
      audio.play(best > 0 && (b.scores[me] ?? 0) === best ? "win" : "lose");
    }
  }

  if (next.game === "draw" && prev.game === "draw") {
    const a = prev.state;
    const b = next.state;
    const newlyGuessed = Object.keys(b.guessed).filter((id) => !(id in a.guessed));
    if (newlyGuessed.includes(me)) audio.play("correct");
    else if (newlyGuessed.length > 0) audio.play("blip");
    if (b.phase === "choose" && a.phase !== "choose" && b.youAreDrawer) audio.play("turn");
    if (b.phase === "draw" && a.phase === "choose") audio.play("go");
    if (from !== "result" && to === "result") {
      const best = Math.max(0, ...Object.values(b.scores));
      audio.play(best > 0 && (b.scores[me] ?? 0) === best ? "win" : "lose");
    }
  }

  if (next.game === "liar" && prev.game === "liar") {
    const b = next.state;
    if (from !== to && (to === "vote" || to === "guess")) audio.play("turn");
    if (b.voted.length > prev.state.voted.length) audio.play("blip");
    if (from !== "result" && to === "result") {
      const iWon = b.youPlaying && (b.winner === "liar") === (b.liarId === me);
      audio.play(iWon ? "win" : "lose");
    }
  }

  if (next.game === "typing" && prev.game === "typing") {
    const b = next.state;
    const mine = b.progress[me];
    if (mine?.finishedMs != null && prev.state.progress[me]?.finishedMs == null) {
      audio.play("correct");
    }
    if (from !== "result" && to === "result") {
      const fastest = Object.entries(b.progress)
        .filter(([, p]) => p.finishedMs != null)
        .sort((x, y) => x[1].finishedMs! - y[1].finishedMs!)[0]?.[0];
      audio.play(fastest === me ? "win" : "lose");
    }
  }

  if (next.game === "wordchain" && prev.game === "wordchain") {
    const a = prev.state;
    const b = next.state;
    if (b.lastEvent && b.lastEvent !== a.lastEvent && JSON.stringify(b.lastEvent) !== JSON.stringify(a.lastEvent)) {
      audio.play("wrong");
    } else if (b.chain.at(-1)?.word !== a.chain.at(-1)?.word && b.chain.length > 0) {
      audio.play("blip");
    }
    if (b.phase === "play" && b.turnId === me && a.turnId !== me) audio.play("turn");
    if (from !== "result" && to === "result") audio.play(b.winnerId === me ? "win" : "lose");
  }
}
