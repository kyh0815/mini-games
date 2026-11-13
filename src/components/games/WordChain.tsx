"use client";

import { useState, type FormEvent } from "react";
import { Panel, Screen } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { LedTimer } from "@/components/arcade/timer";
import { Skull, WarningDiamond } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Lobby, Option, Result, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "wordchain" }>;

function Lives({ count, max }: { count: number; max: number }) {
  if (count <= 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Skull className="size-4" /> 탈락
      </span>
    );
  }
  return (
    <span className="flex gap-0.5" aria-label={`목숨 ${count}개`}>
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 7 6"
          aria-hidden
          shapeRendering="crispEdges"
          className={cn("h-3.5 w-4", i < count ? "fill-pop-red" : "fill-muted")}
        >
          <path d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z" />
        </svg>
      ))}
    </span>
  );
}

export function WordChain({ view, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const [turnSeconds, setTurnSeconds] = useState("15");
  const [text, setText] = useState("");

  if (s.phase === "lobby") {
    return (
      <Lobby
        view={view}
        send={send}
        onStart={() => send({ type: "start", turnSeconds: Number(turnSeconds) })}
      >
        <Option label="제한 시간">
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label="제한 시간"
            value={turnSeconds}
            onValueChange={(v) => v && setTurnSeconds(v)}
          >
            {["10", "15", "20"].map((n) => (
              <ToggleGroupItem key={n} value={n}>
                {n}초
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Option>
      </Lobby>
    );
  }

  const players = (
    <ul className="flex flex-col gap-2">
      {s.order.map((id) => {
        const out = s.lives[id] <= 0;
        const turn = s.turnId === id;
        return (
          <li
            key={id}
            aria-current={turn || undefined}
            className={cn(
              "flex h-11 items-center gap-3 border-2 px-3 transition-colors",
              turn ? "border-game bg-accent" : "border-border bg-card",
              out && "opacity-45",
            )}
          >
            <PixelAvatar seed={id} className="size-7" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {nameOf(id)}
              {id === view.you && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">나</span>
              )}
            </span>
            <Lives count={s.lives[id]} max={s.maxLives} />
          </li>
        );
      })}
    </ul>
  );

  if (s.phase === "result") {
    const iPlayed = s.order.includes(view.you);
    return (
      <Result
        view={view}
        send={send}
        tone={!s.winnerId || !iPlayed ? "neutral" : s.winnerId === view.you ? "win" : "lose"}
        title={s.winnerId ? `${nameOf(s.winnerId)} 우승` : "승자 없음"}
        subtitle={s.winnerId ? "마지막까지 살아남았습니다." : undefined}
      >
        {players}
      </Result>
    );
  }

  const myTurn = s.turnId === view.you;
  const last = s.chain[s.chain.length - 1];
  const linked = !!last && s.starts !== null;
  const canObject = linked && last.playerId !== view.you && s.lives[view.you] > 0;
  const objected = s.objections.includes(view.you);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (await send({ type: "word", text })) setText("");
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <Screen>
        <div className="flex flex-col gap-5 p-5 sm:p-7">
          <div
            role="status"
            className={cn(
              "flex min-h-10 items-center gap-2 border-2 px-3 text-sm",
              s.lastEvent ? "animate-shake border-pop-red text-pop-red" : "border-transparent",
            )}
          >
            {s.lastEvent && (
              <>
                <WarningDiamond className="size-5 shrink-0" />
                {s.lastEvent.type === "timeout"
                  ? `${nameOf(s.lastEvent.playerId)} 님이 시간 초과로 목숨을 잃었습니다.`
                  : `'${s.lastEvent.word}' 무효. ${nameOf(s.lastEvent.playerId)} 님이 목숨을 잃었습니다.`}
              </>
            )}
          </div>

          <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-center">
            {linked ? (
              <>
                <p key={last.word} className="font-pixel animate-pop fs-4 text-foreground sm:fs-6">
                  {last.word.slice(0, -1)}
                  <span className="text-game">{last.word.slice(-1)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {nameOf(last.playerId)} · 다음은{" "}
                  {s.starts!.map((ch, i) => (
                    <span key={ch}>
                      {i > 0 && " 또는 "}
                      <b className="font-semibold text-game">{ch}</b>
                    </span>
                  ))}
                  (으)로 시작
                </p>
              </>
            ) : (
              <p className="font-pixel animate-pop fs-2 text-foreground">아무 단어로나 시작</p>
            )}
          </div>

          <LedTimer deadline={s.deadline} totalMs={s.turnSeconds * 1000} />

          {myTurn ? (
            <form onSubmit={submit} className="flex gap-3">
              <Input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={s.starts ? `'${s.starts[0]}'(으)로 시작하는 단어` : "아무 단어"}
                aria-label="단어"
                maxLength={10}
                autoComplete="off"
              />
              <Button type="submit" variant="game">
                제출
              </Button>
            </form>
          ) : (
            <p className="flex h-10 items-center justify-center text-sm text-muted-foreground">
              {nameOf(s.turnId)} 님의 차례입니다.
            </p>
          )}

          <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
              {s.chain.slice(-6, -1).map((entry, i) => (
                <li key={`${entry.word}-${i}`} className="flex items-center gap-1.5">
                  {entry.word}
                  <span>→</span>
                </li>
              ))}
            </ol>
            {canObject && (
              <Button
                variant="outline"
                size="sm"
                disabled={objected}
                onClick={() => send({ type: "object" })}
              >
                {objected ? "이의 제기함" : "이의 제기"} {s.objections.length}/{s.objectionsNeeded}
              </Button>
            )}
          </div>
        </div>
      </Screen>
      <Panel label="PLAYERS">
        <div className="p-3">{players}</div>
      </Panel>
    </div>
  );
}
