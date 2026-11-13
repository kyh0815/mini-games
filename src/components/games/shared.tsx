"use client";

import type { ReactNode } from "react";
import { Blink, Panel, Screen } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { Crown, Play, Reload, UserX } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getGame } from "@/lib/games";
import type { GameAction, RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";

export type GameProps<V extends RoomView = RoomView> = {
  view: V;
  /** 서버 시계 기준 현재 시각(ms) */
  now: number;
  send: (action: GameAction) => Promise<boolean>;
  nameOf: (id: string | null | undefined) => string;
};

export function Rules({ rules }: { rules: string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {rules.map((rule, i) => (
        <li key={rule} className="flex gap-3 text-sm/relaxed text-muted-foreground">
          <span className="font-pixel mt-0.5 flex size-5 shrink-0 items-center justify-center bg-game fs-1 text-ink">
            {i + 1}
          </span>
          {rule}
        </li>
      ))}
    </ol>
  );
}

/** 옵션 한 줄: 왼쪽에 이름, 오른쪽에 선택 컨트롤 */
export function Option({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span className="font-pixel fs-1 text-muted-foreground">{label}</span>
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
  const emptySlots = Math.max(0, Math.min(12, Math.max(4, view.players.length + 1)) - view.players.length);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <Panel
        label={`PLAYERS ${String(view.players.length).padStart(2, "0")}/12`}
        action={<Blink className="fs-1 text-neon-yellow">WAITING…</Blink>}
      >
        <ul className="grid gap-2 p-4 sm:grid-cols-2">
          {view.players.map((p, i) => (
            <li
              key={p.id}
              className={cn(
                "flex animate-rise items-center gap-3 border-2 bg-ink/50 p-2.5",
                p.id === view.you ? "border-game" : "border-border",
                !p.online && "opacity-45",
              )}
            >
              <span className="font-pixel w-7 fs-1 text-game">{i + 1}P</span>
              <PixelAvatar seed={p.id} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {p.name}
                {p.id === view.you && <span className="ml-1.5 text-xs text-muted-foreground">나</span>}
              </span>
              {p.id === view.hostId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Crown aria-label="방장" className="size-5 text-neon-yellow" />
                  </TooltipTrigger>
                  <TooltipContent>방장</TooltipContent>
                </Tooltip>
              )}
              {isHost && p.id !== view.you && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${p.name} 내보내기`}
                      onClick={() => send({ type: "kick", target: p.id })}
                    >
                      <UserX />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>내보내기</TooltipContent>
                </Tooltip>
              )}
            </li>
          ))}
          {Array.from({ length: emptySlots }, (_, i) => (
            <li
              key={`empty-${i}`}
              className="flex h-[3.75rem] items-center justify-center border-2 border-dashed border-border/70"
            >
              <Blink className="fs-1 text-muted-foreground/70">INSERT COIN</Blink>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-4 border-t-2 border-border p-4">
          {isHost ? (
            <>
              {children}
              <Button variant="game" size="lg" onClick={onStart} disabled={missing > 0} className="w-full">
                <Play />
                {missing > 0 ? `${missing}명 더 필요` : "GAME START"}
              </Button>
            </>
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">
              방장이 게임을 시작하기를 기다리는 중입니다.
            </p>
          )}
        </div>
      </Panel>
      <Panel label="HOW TO PLAY" className="self-start">
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
  return (
    <Screen className="mx-auto w-full max-w-2xl">
      <div className="flex flex-col items-center gap-6 px-5 py-10 text-center">
        <Blink
          className={cn(
            "fs-15",
            tone === "win" && "text-neon-green",
            tone === "lose" && "text-neon-red",
            tone === "neutral" && "text-muted-foreground",
          )}
        >
          {tone === "win" ? "YOU WIN!" : tone === "lose" ? "YOU LOSE" : "GAME OVER"}
        </Blink>
        <div className="flex animate-pop flex-col items-center gap-3">
          <h2
            className={cn(
              "font-pixel fs-3 neon-text sm:fs-4",
              tone === "win" ? "text-neon-yellow" : "text-game",
            )}
          >
            {title}
          </h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children && <div className="w-full text-left">{children}</div>}
        {isHost ? (
          <Button variant="coin" size="lg" onClick={() => send({ type: "reset" })}>
            <Reload />
            CONTINUE
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">방장이 다음 판을 준비하는 중입니다.</p>
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
        "flex items-center gap-3 border-2 bg-ink/50 px-3 py-2",
        you ? "border-game" : "border-border",
      )}
    >
      <span
        className={cn(
          "font-pixel w-8 fs-15",
          rank === 1 ? "text-neon-yellow" : "text-muted-foreground",
        )}
      >
        {rank === 1 ? "1ST" : rank === 2 ? "2ND" : rank === 3 ? "3RD" : `${rank}TH`}
      </span>
      <PixelAvatar seed={id} className="size-7" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
      {children}
    </li>
  );
}

export function GameTag({ children }: { children: ReactNode }) {
  return (
    <span className="font-pixel border-2 border-game/70 bg-ink/60 px-2 py-0.5 fs-1 text-game">
      {children}
    </span>
  );
}
