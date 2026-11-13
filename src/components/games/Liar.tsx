"use client";

import { useState, type FormEvent } from "react";
import { Blink, Panel, Screen } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { LedTimer } from "@/components/arcade/timer";
import { Check, Eye, EyeOff } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GameTag, Lobby, Option, Result, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "liar" }>;

export function Liar({ view, now, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const isHost = view.hostId === view.you;
  const [category, setCategory] = useState("random");
  const [shown, setShown] = useState(false);
  const [guess, setGuess] = useState("");

  if (s.phase === "lobby") {
    return (
      <Lobby
        view={view}
        send={send}
        onStart={() => {
          setShown(false);
          setGuess("");
          send({ type: "start", category });
        }}
      >
        <Option label="주제">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40" aria-label="주제">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">랜덤</SelectItem>
              {s.categories.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Option>
      </Lobby>
    );
  }

  const head = (title: string) => (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-pixel fs-15 text-foreground">{title}</h2>
      <GameTag>주제: {s.category}</GameTag>
    </div>
  );

  if (s.phase === "discuss") {
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <Screen>
          <div className="flex flex-col gap-6 p-5 sm:p-7">
            {head("설명 시간")}
            {s.youPlaying ? (
              // 옆자리에서 화면이 보일 수 있어, 눌렀을 때만 자기 카드가 보이게 합니다.
              <button
                type="button"
                onClick={() => setShown((v) => !v)}
                aria-pressed={shown}
                className={cn(
                  "group flex min-h-44 w-full flex-col items-center justify-center gap-3 border-2 border-dashed p-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  shown ? "border-game bg-ink/60" : "border-border hover:border-game",
                )}
              >
                {shown ? (
                  <>
                    {s.youAreLiar ? (
                      <>
                        <span className="font-pixel animate-pop fs-3 text-neon-red neon-text">
                          당신은 라이어
                        </span>
                        <span className="text-sm text-muted-foreground">
                          제시어를 아는 척 둘러대세요.
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-pixel fs-1 text-muted-foreground">제시어</span>
                        <span className="font-pixel animate-pop fs-4 text-game neon-text">
                          {s.word}
                        </span>
                      </>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <EyeOff className="size-4" /> 다시 누르면 가려집니다
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="size-10 text-game transition-transform group-hover:scale-110" />
                    <Blink className="fs-15 text-game">PRESS TO REVEAL</Blink>
                    <span className="text-sm text-muted-foreground">
                      주변에 화면이 보이지 않는지 확인하고 누르세요.
                    </span>
                  </>
                )}
              </button>
            ) : (
              <p className="border-2 border-border bg-ink/60 p-5 text-center text-sm text-muted-foreground">
                게임 도중에 들어와 이번 판은 관전합니다.
              </p>
            )}
            {isHost ? (
              <Button variant="game" size="lg" onClick={() => send({ type: "startVote" })}>
                투표 시작
              </Button>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                모두 설명을 마치면 방장이 투표를 시작합니다.
              </p>
            )}
          </div>
        </Screen>
        <Panel label="설명 순서" className="self-start">
          <ol className="flex flex-col gap-2 p-3">
            {s.order.map((id, i) => (
              <li key={id} className="flex items-center gap-3 border-2 border-border bg-ink/50 px-3 py-2">
                <span className="font-pixel w-5 fs-15 text-game">{i + 1}</span>
                <PixelAvatar seed={id} className="size-7" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{nameOf(id)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    );
  }

  if (s.phase === "vote") {
    return (
      <Screen className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col gap-6 p-5 sm:p-7">
          {head("라이어는 누구?")}
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.participants.map((id) => {
              const mine = s.yourVote === id;
              const self = id === view.you;
              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled={!s.youPlaying || self}
                    aria-pressed={mine}
                    onClick={() => send({ type: "vote", target: id })}
                    className={cn(
                      "flex h-16 w-full items-center gap-3 border-2 px-3 text-left outline-none transition-[border-color,transform,box-shadow] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45",
                      mine
                        ? "border-game bg-game/15 shadow-[0_0_18px_color-mix(in_oklch,var(--game)_45%,transparent)]"
                        : "border-border bg-ink/50 enabled:hover:-translate-y-0.5 enabled:hover:border-game",
                    )}
                  >
                    <PixelAvatar seed={id} />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {nameOf(id)}
                      {self && <span className="ml-1.5 text-xs text-muted-foreground">나</span>}
                    </span>
                    {mine ? (
                      <span className="font-pixel fs-1 text-game">지목!</span>
                    ) : (
                      s.voted.includes(id) && (
                        <Check aria-label="투표 완료" className="size-5 text-neon-green" />
                      )
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-pixel fs-1 text-muted-foreground">
              VOTED <span className="text-neon-yellow">{s.voted.length}</span>/{s.participants.length} ·
              마감 전에는 바꿀 수 있습니다
            </p>
            {isHost && (
              <Button variant="outline" size="sm" onClick={() => send({ type: "closeVote" })}>
                지금 마감
              </Button>
            )}
          </div>
        </div>
      </Screen>
    );
  }

  if (s.phase === "guess") {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      if (guess.trim()) send({ type: "guess", text: guess });
    };
    return (
      <Screen className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col gap-6 p-5 sm:p-7">
          {head("라이어 적발!")}
          <div className="flex animate-pop flex-col items-center gap-3 py-2">
            <PixelAvatar seed={s.liarId ?? ""} className="size-16" />
            <p className="font-pixel fs-2 text-neon-red neon-text">{nameOf(s.liarId)}</p>
            <p className="text-sm text-muted-foreground">라이어의 마지막 기회: 제시어를 맞히면 역전!</p>
          </div>
          <LedTimer now={now} deadline={s.deadline} totalMs={30_000} />
          {s.youAreLiar ? (
            <form onSubmit={submit} className="flex gap-3">
              <Input
                autoFocus
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="제시어는? (기회는 한 번)"
                aria-label="제시어"
                maxLength={20}
                autoComplete="off"
              />
              <Button type="submit" variant="game">
                제출
              </Button>
            </form>
          ) : (
            <p className="text-center">
              <Blink className="fs-15 text-muted-foreground">라이어가 고민하는 중…</Blink>
            </p>
          )}
        </div>
      </Screen>
    );
  }

  const liarWon = s.winner === "liar";
  const caught = s.accusedId === s.liarId;
  const iWon = s.youPlaying && liarWon === s.youAreLiar;
  return (
    <Result
      view={view}
      send={send}
      tone={!s.youPlaying ? "neutral" : iWon ? "win" : "lose"}
      title={liarWon ? "LIAR WINS" : "CITIZENS WIN"}
      subtitle={
        !caught
          ? "라이어를 찾아내지 못했습니다."
          : liarWon
            ? "라이어가 제시어를 맞혀 역전했습니다."
            : s.liarGuess
              ? "라이어가 제시어를 맞히지 못했습니다."
              : "라이어가 시간 안에 답하지 못했습니다."
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3">
          <div className="border-2 border-border bg-ink/50 p-3">
            <dt className="font-pixel fs-1 text-muted-foreground">라이어</dt>
            <dd className="mt-1 flex items-center gap-2 font-medium">
              <PixelAvatar seed={s.liarId ?? ""} className="size-7" />
              <span className="truncate">{nameOf(s.liarId)}</span>
            </dd>
          </div>
          <div className="border-2 border-border bg-ink/50 p-3">
            <dt className="font-pixel fs-1 text-muted-foreground">제시어 · {s.category}</dt>
            <dd className="font-pixel mt-1 fs-15 text-game">{s.word}</dd>
          </div>
          {s.liarGuess && (
            <div className="col-span-2 border-2 border-border bg-ink/50 p-3">
              <dt className="font-pixel fs-1 text-muted-foreground">라이어의 답</dt>
              <dd className="mt-1 font-medium">{s.liarGuess}</dd>
            </div>
          )}
        </dl>
        <div>
          <h3 className="font-pixel mb-2 fs-1 text-muted-foreground">투표 결과</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.participants.map((id) => {
              const target = s.votes?.[id];
              return (
                <li key={id} className="flex items-center gap-2 border-2 border-border bg-ink/50 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{nameOf(id)}</span>
                  <span className="text-muted-foreground">▶</span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-right",
                      !target && "text-muted-foreground",
                      target === s.liarId && "text-neon-green",
                    )}
                  >
                    {target ? nameOf(target) : "기권"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Result>
  );
}
