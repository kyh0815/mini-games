"use client";

import { Label11, Screen } from "@/components/arcade/panel";
import { useNow } from "@/lib/clock";
import { useT } from "@/lib/i18n";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { GameProps } from "./shared";
import { SoloIntro, SoloResult, SoloShell } from "./solo";

type View = Extract<RoomView, { game: "sequence" }>;

const BOARD = "sequence";
/** 연달아 뒤집히는 카드가 구분되도록, 한 장이 덮이고 다음 장이 뒤집히기 전에 두는 틈 */
const GAP_MS = 150;

function Board({ view, send }: Pick<GameProps<View>, "view" | "send">) {
  const s = view.state;
  const t = useT();
  const now = useNow();
  const canPick = now >= s.inputAt;
  const waiting = now < s.showAt;
  const picked = s.order.slice(0, s.progress);

  const status = waiting
    ? s.cleared > 0
      ? t("성공! 이번에는 {n}장입니다.", { n: s.length })
      : t("{n}장이 뒤집히는 순서를 기억하세요.", { n: s.length })
    : canPick
      ? t("뒤집혔던 순서대로 누르세요.")
      : t("순서를 기억하세요.");

  return (
    <Screen>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-end justify-between">
          <span className="flex items-baseline gap-1.5 text-sm text-muted-foreground">
            <span className="font-pixel fs-2 text-foreground tabular-nums">{s.length}</span>
            {t("장")}
          </span>
          <Label11 className="tabular-nums">
            {canPick ? `${s.progress}/${s.length}` : waiting ? "READY" : "WATCH"}
          </Label11>
        </div>
        <ul className="mx-auto grid w-full max-w-md grid-cols-4 gap-2">
          {Array.from({ length: s.cards }, (_, i) => {
            const at = s.order.indexOf(i);
            const from = s.showAt + at * s.stepMs;
            const shown = at >= 0 && now >= from && now < from + s.stepMs - GAP_MS;
            const done = picked.includes(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  aria-label={t("{n}번 카드", { n: i + 1 })}
                  aria-pressed={shown || done}
                  disabled={!canPick || done}
                  onClick={() => send({ type: "pick", index: i })}
                  className={cn(
                    "flex aspect-square w-full items-center justify-center border-2 border-ink outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    shown || done
                      ? "bg-game text-ink"
                      : "bg-secondary pixel-shadow enabled:hover:bg-accent enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none",
                    done && "opacity-60",
                  )}
                >
                  {done && <span className="font-pixel fs-15 tabular-nums">{picked.indexOf(i) + 1}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <p aria-live="polite" className="text-center text-sm text-muted-foreground">
          {status}
        </p>
      </div>
    </Screen>
  );
}

/** 끝난 뒤, 정답 순서와 내가 잘못 누른 카드를 보여 줍니다. */
function Answer({ view }: { view: View }) {
  const s = view.state;
  const t = useT();
  if (!s.miss) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <ul aria-hidden className="grid w-44 grid-cols-4 gap-1">
        {Array.from({ length: s.cards }, (_, i) => {
          const at = s.order.indexOf(i);
          return (
            <li
              key={i}
              className={cn(
                "font-pixel flex aspect-square items-center justify-center border-2 border-ink fs-1 tabular-nums",
                i === s.miss!.picked
                  ? "bg-pop-red text-ink"
                  : at >= 0
                    ? "bg-game text-ink"
                    : "bg-secondary",
              )}
            >
              {at >= 0 ? at + 1 : ""}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">{t("숫자는 정답 순서, 빨간 칸은 잘못 누른 카드입니다.")}</p>
    </div>
  );
}

export function Sequence({ view, send }: GameProps<View>) {
  const s = view.state;
  const t = useT();
  if (s.phase === "lobby") {
    return (
      <SoloShell view={view} boardKey={BOARD}>
        <SoloIntro view={view} onStart={() => send({ type: "start" })} />
      </SoloShell>
    );
  }
  if (s.phase === "result") {
    return (
      <SoloShell view={view} boardKey={BOARD}>
        <SoloResult
          last={s.last}
          detail={
            s.miss
              ? t("{n}장에서 틀렸습니다.", { n: s.length })
              : t("모든 카드를 순서대로 맞혔습니다.")
          }
          onRetry={() => send({ type: "start" })}
          onBack={() => send({ type: "reset" })}
        >
          <Answer view={view} />
        </SoloResult>
      </SoloShell>
    );
  }
  return (
    <SoloShell view={view} boardKey={BOARD}>
      <Board view={view} send={send} />
    </SoloShell>
  );
}
