"use client";

import type { ReactNode } from "react";
import { Blink, Label11, Panel, Screen } from "@/components/arcade/panel";
import { Mascot } from "@/components/arcade/mascot";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { Crown, UserX } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getGame } from "@/lib/games";
import { useT } from "@/lib/i18n";
import type { GameAction, RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";

export type GameProps<V extends RoomView = RoomView> = {
  view: V;
  send: (action: GameAction) => Promise<boolean>;
  nameOf: (id: string | null | undefined) => string;
};

export function Rules({ rules }: { rules: string[] }) {
  const t = useT();
  return (
    <ol className="flex flex-col gap-2.5">
      {rules.map((rule, i) => (
        <li key={rule} className="flex gap-3 text-sm/relaxed text-muted-foreground">
          <span className="font-pixel mt-1 w-4 shrink-0 fs-1 text-game">{i + 1}</span>
          {t(rule)}
        </li>
      ))}
    </ol>
  );
}

/** 옵션 한 줄: 왼쪽에 이름, 오른쪽에 선택 컨트롤 */
export function Option({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** 대기실: 참가자 자리, 방장 옵션, 시작 버튼 */
export function Lobby({
  view,
  send,
  onStart,
  children,
}: Pick<GameProps, "view" | "send"> & { onStart: () => void; children?: ReactNode }) {
  const game = getGame(view.game)!;
  const isHost = view.hostId === view.you;
  const online = view.players.filter((p) => p.online).length;
  const missing = game.minPlayers - online;
  const t = useT();

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <Panel
        label={`PLAYERS ${String(view.players.length).padStart(2, "0")}/${game.maxPlayers}`}
        action={<Blink className="fs-1 text-pop-yellow">WAITING</Blink>}
      >
        <ul className="grid gap-2 p-4 sm:grid-cols-2">
          {view.players.map((p, i) => (
            <li
              key={p.id}
              className={cn(
                "flex h-14 animate-rise items-center gap-3 border-2 bg-inset px-3",
                p.id === view.you ? "border-foreground/70" : "border-border",
                !p.online && "opacity-45",
              )}
            >
              <span className="font-pixel w-6 fs-1 text-muted-foreground">{i + 1}P</span>
              <PixelAvatar seed={p.id} className="size-8" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {p.name}
                {p.id === view.you && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("나")}</span>
                )}
              </span>
              {p.id === view.hostId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Crown aria-label={t("방장")} className="size-5 text-pop-yellow" />
                  </TooltipTrigger>
                  <TooltipContent>{t("방장")}</TooltipContent>
                </Tooltip>
              )}
              {isHost && p.id !== view.you && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("{name} 내보내기", { name: p.name })}
                      onClick={() => send({ type: "kick", target: p.id })}
                    >
                      <UserX />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("내보내기")}</TooltipContent>
                </Tooltip>
              )}
            </li>
          ))}
          {view.players.length < game.maxPlayers && (
            <li className="flex h-14 items-center justify-center border-2 border-dashed border-border text-sm text-muted-foreground">
              {t("초대 링크를 공유해 보세요")}
            </li>
          )}
        </ul>
        <div className="flex flex-col gap-4 border-t-2 border-ink p-4">
          {isHost ? (
            <>
              {children}
              <Button variant="game" size="lg" onClick={onStart} disabled={missing > 0} className="w-full">
                {missing > 0 ? t("{n}명 더 모이면 시작할 수 있습니다", { n: missing }) : t("게임 시작")}
              </Button>
            </>
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">
              {t("방장이 게임을 시작하기를 기다리는 중입니다.")}
            </p>
          )}
        </div>
      </Panel>
      <Panel label="HOW TO PLAY">
        <div className="p-4">
          <Rules rules={game.rules} />
        </div>
      </Panel>
    </div>
  );
}

/** 결과 화면 공통 틀 */
export function Result({
  view,
  send,
  tone,
  title,
  subtitle,
  children,
}: Pick<GameProps, "view" | "send"> & {
  tone: "win" | "lose" | "neutral";
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  const isHost = view.hostId === view.you;
  const t = useT();
  return (
    <Screen className="mx-auto w-full max-w-2xl">
      <div className="flex flex-col items-center gap-6 px-5 py-9 text-center">
        <div className="flex animate-pop flex-col items-center gap-2">
          <Mascot
            mood={tone === "win" ? "happy" : tone === "lose" ? "sad" : "smile"}
            bob={tone === "win"}
            className="mb-2 w-14"
          />
          <Label11
            className={cn(tone === "win" && "text-pop-green", tone === "lose" && "text-pop-red")}
          >
            {tone === "win" ? "YOU WIN" : tone === "lose" ? "YOU LOSE" : "GAME OVER"}
          </Label11>
          <h2 className="font-pixel fs-3 text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children && <div className="w-full text-left">{children}</div>}
        {isHost ? (
          <Button size="lg" onClick={() => send({ type: "reset" })}>
            {t("한 판 더")}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{t("방장이 다음 판을 준비하는 중입니다.")}</p>
        )}
      </div>
    </Screen>
  );
}

/** 순위표 한 줄 */
export function RankRow({
  rank,
  id,
  name,
  you,
  children,
}: {
  rank: number;
  id: string;
  name: string;
  you: boolean;
  children?: ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex h-11 items-center gap-3 border-2 bg-card px-3",
        you ? "border-foreground/70" : "border-border",
      )}
    >
      <span
        className={cn(
          "font-pixel w-5 fs-15 tabular-nums",
          rank === 1 ? "text-pop-yellow" : "text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <PixelAvatar seed={id} className="size-7" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
      {children}
    </li>
  );
}

/** 주제 등 짧은 정보를 담는 꼬리표 */
export function GameTag({ children }: { children: ReactNode }) {
  return (
    <span className="border-2 border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}
