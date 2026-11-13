"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import { Label11, Screen } from "@/components/arcade/panel";
import {
  Alien, Balloon, Bookmark, Bug, Clock, Coins, Crown, Fire, Flag, Gamepad, Heart, Home,
  Hourglass, Lightbulb, Lock, Music, Skull, Trophy,
} from "@/components/icons";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNow } from "@/lib/clock";
import { useT } from "@/lib/i18n";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Option, type GameProps } from "./shared";
import { SoloIntro, SoloResult, SoloShell } from "./solo";

type View = Extract<RoomView, { game: "memory" }>;

const SYMBOLS: ComponentType<SVGProps<SVGSVGElement>>[] = [
  Heart, Trophy, Crown, Music, Skull, Flag, Clock, Coins, Gamepad,
  Home, Lock, Alien, Bookmark, Hourglass, Fire, Lightbulb, Bug, Balloon,
];
const COLORS = [
  "text-pop-red", "text-pop-yellow", "text-pop-green", "text-pop-blue",
  "text-pop-pink", "text-pop-violet", "text-pop-orange", "text-pop-teal",
];
const LEVELS = [
  { value: "easy", label: "쉬움 4×4" },
  { value: "normal", label: "보통 6×4" },
  { value: "hard", label: "어려움 6×6" },
];

function Elapsed({ startAt }: { startAt: number }) {
  const now = useNow();
  const ms = startAt > 0 ? Math.max(0, now - startAt) : 0;
  return <span className="font-pixel fs-2 tabular-nums">{(ms / 1000).toFixed(1)}</span>;
}

export function Memory({ view, send }: GameProps<View>) {
  const s = view.state;
  const t = useT();
  const [level, setLevel] = useState<string>(s.level);
  const start = () => send({ type: "start", level });

  if (s.phase === "lobby") {
    return (
      <SoloShell view={view} boardKey={`memory-${level}`}>
        <SoloIntro view={view} onStart={start}>
          <Option label={t("난이도")}>
            <ToggleGroup
              type="single"
              variant="outline"
              aria-label={t("난이도")}
              value={level}
              onValueChange={(v) => v && setLevel(v)}
            >
              {LEVELS.map((l) => (
                <ToggleGroupItem key={l.value} value={l.value}>
                  {t(l.label)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Option>
        </SoloIntro>
      </SoloShell>
    );
  }

  if (s.phase === "result") {
    return (
      <SoloShell view={view} boardKey={`memory-${s.level}`}>
        <SoloResult
          last={s.last}
          detail={t("{n}번 뒤집어서 모두 찾았습니다.", { n: s.moves })}
          onRetry={() => send({ type: "start", level: s.level })}
          onBack={() => send({ type: "reset" })}
        />
      </SoloShell>
    );
  }

  return (
    <SoloShell view={view} boardKey={`memory-${s.level}`}>
      <Screen>
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-end justify-between">
            <span className="flex items-baseline gap-1.5 text-sm text-muted-foreground">
              <Elapsed startAt={s.startAt} />
              {t("초")}
            </span>
            <Label11 className="tabular-nums">MOVES {s.moves}</Label11>
          </div>
          <ul
            className="mx-auto grid w-full max-w-xl gap-2"
            style={{ gridTemplateColumns: `repeat(${s.cols}, minmax(0, 1fr))` }}
          >
            {s.faces.map((face, i) => {
              const Icon = face === null ? null : SYMBOLS[face % SYMBOLS.length];
              const done = s.matched[i];
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-label={
                      face === null
                        ? t("{n}번 카드, 뒤집히지 않음", { n: i + 1 })
                        : t("{n}번 카드", { n: i + 1 })
                    }
                    disabled={done}
                    onClick={() => send({ type: "flip", index: i })}
                    className={cn(
                      "flex aspect-square w-full items-center justify-center border-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      Icon
                        ? "border-foreground/60 bg-card"
                        : "border-ink bg-secondary pixel-shadow hover:bg-accent active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                      done && "border-border opacity-45",
                    )}
                  >
                    {Icon ? (
                      <Icon className={cn("size-1/2 animate-pop", COLORS[face! % COLORS.length])} />
                    ) : (
                      <span className="font-pixel fs-15 text-muted-foreground/60">?</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-center text-xs text-muted-foreground">
            {s.startAt === 0 ? t("첫 카드를 뒤집으면 시간이 흐르기 시작합니다.") : t("같은 그림 두 장을 찾으세요.")}
          </p>
        </div>
      </Screen>
    </SoloShell>
  );
}
