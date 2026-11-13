"use client";

import { useState, type FormEvent } from "react";
import { Panel, Screen } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { LedTimer } from "@/components/arcade/timer";
import { Check, Eye, EyeOff } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLang, useT } from "@/lib/i18n";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GameTag, Lobby, Option, Result, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "liar" }>;

export function Liar({ view, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const t = useT();
  const lang = useLang();
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
        <Option label={t("주제")}>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40" aria-label={t("주제")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">{t("랜덤")}</SelectItem>
              {s.categories.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {t(c.label)}
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
      <h2 className="text-base font-semibold">{title}</h2>
      {/* 주제 이름은 서버가 한국어로 보내므로 그대로 넘겨 옮깁니다. */}
      <GameTag>{t("주제 · {category}", { category: t(s.category) })}</GameTag>
    </div>
  );

  if (s.phase === "discuss") {
    return (
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <Screen>
          <div className="flex flex-col gap-6 p-5 sm:p-7">
            {head(t("설명 시간"))}
            {s.youPlaying ? (
              // 옆자리에서 화면이 보일 수 있어, 눌렀을 때만 자기 카드가 보이게 합니다.
              <button
                type="button"
                onClick={() => setShown((v) => !v)}
                aria-pressed={shown}
                className={cn(
                  "group flex min-h-44 w-full flex-col items-center justify-center gap-3 border-2 border-dashed p-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  shown ? "border-foreground/70 bg-card" : "border-border hover:border-foreground/60",
                )}
              >
                {shown ? (
                  <>
                    {s.youAreLiar ? (
                      <>
                        <span className="font-pixel animate-pop fs-3 text-pop-red">{t("당신은 라이어")}</span>
                        <span className="text-sm text-muted-foreground">
                          {t("제시어를 아는 척 둘러대세요.")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-muted-foreground">{t("제시어")}</span>
                        <span className="font-pixel animate-pop fs-4 text-foreground">{s.word?.[lang]}</span>
                      </>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <EyeOff className="size-4" /> {t("다시 누르면 가려집니다")}
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="size-9 text-muted-foreground transition-colors group-hover:text-foreground" />
                    <span className="font-semibold">{t("눌러서 내 카드 확인")}</span>
                    <span className="text-sm text-muted-foreground">
                      {t("주변에 화면이 보이지 않는지 확인하고 누르세요.")}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <p className="border-2 border-border p-5 text-center text-sm text-muted-foreground">
                {t("게임 도중에 들어와 이번 판은 관전합니다.")}
              </p>
            )}
            {isHost ? (
              <Button variant="game" size="lg" onClick={() => send({ type: "startVote" })}>
                {t("투표 시작")}
              </Button>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {t("모두 설명을 마치면 방장이 투표를 시작합니다.")}
              </p>
            )}
          </div>
        </Screen>
        <Panel label="ORDER">
          <ol className="flex flex-col gap-2 p-3">
            {s.order.map((id, i) => (
              <li key={id} className="flex h-11 items-center gap-3 border-2 border-border bg-inset px-3">
                <span className="font-pixel w-4 fs-1 text-muted-foreground">{i + 1}</span>
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
          {head(t("라이어는 누구일까요?"))}
          <ul className="grid gap-2.5 sm:grid-cols-2">
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
                      "flex h-14 w-full items-center gap-3 border-2 px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45",
                      mine
                        ? "border-game bg-accent"
                        : "border-border bg-card enabled:hover:border-foreground/60",
                    )}
                  >
                    <PixelAvatar seed={id} className="size-8" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {nameOf(id)}
                      {self && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("나")}</span>}
                    </span>
                    {mine ? (
                      <span className="text-xs font-semibold text-game">{t("내가 지목")}</span>
                    ) : (
                      s.voted.includes(id) && (
                        <Check aria-label={t("투표 완료")} className="size-5 text-pop-green" />
                      )
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t("{voted}/{total}명 투표 · 마감 전에는 바꿀 수 있습니다", {
                voted: s.voted.length,
                total: s.participants.length,
              })}
            </p>
            {isHost && (
              <Button variant="outline" size="sm" onClick={() => send({ type: "closeVote" })}>
                {t("지금 마감")}
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
          {head(t("라이어를 찾았습니다"))}
          <div className="flex animate-pop flex-col items-center gap-3 py-2">
            <PixelAvatar seed={s.liarId ?? ""} className="size-14" />
            <p className="font-pixel fs-2 text-foreground">{nameOf(s.liarId)}</p>
            <p className="text-sm text-muted-foreground">
              {t("마지막 기회입니다. 라이어가 제시어를 맞히면 역전합니다.")}
            </p>
          </div>
          <LedTimer deadline={s.deadline} totalMs={30_000} />
          {s.youAreLiar ? (
            <form onSubmit={submit} className="flex gap-3">
              <Input
                autoFocus
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder={t("제시어는? (기회는 한 번)")}
                aria-label={t("제시어")}
                maxLength={20}
                autoComplete="off"
              />
              <Button type="submit" variant="game">
                {t("제출")}
              </Button>
            </form>
          ) : (
            <p className="text-center text-sm text-muted-foreground">{t("라이어가 고민하는 중…")}</p>
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
      title={liarWon ? t("라이어 승리") : t("시민 승리")}
      subtitle={
        !caught
          ? t("라이어를 찾아내지 못했습니다.")
          : liarWon
            ? t("라이어가 제시어를 맞혀 역전했습니다.")
            : s.liarGuess
              ? t("라이어가 제시어를 맞히지 못했습니다.")
              : t("라이어가 시간 안에 답하지 못했습니다.")
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-2.5">
          <div className="border-2 border-border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{t("라이어")}</dt>
            <dd className="mt-1.5 flex items-center gap-2 font-semibold">
              <PixelAvatar seed={s.liarId ?? ""} className="size-7" />
              <span className="truncate">{nameOf(s.liarId)}</span>
            </dd>
          </div>
          <div className="border-2 border-border bg-card p-3">
            <dt className="text-xs text-muted-foreground">
              {t("제시어 · {category}", { category: t(s.category) })}
            </dt>
            <dd className="mt-1.5 flex h-7 items-center font-semibold">{s.word?.[lang]}</dd>
          </div>
          {s.liarGuess && (
            <div className="col-span-2 border-2 border-border bg-card p-3">
              <dt className="text-xs text-muted-foreground">{t("라이어의 답")}</dt>
              <dd className="mt-1.5 font-semibold">{s.liarGuess}</dd>
            </div>
          )}
        </dl>
        <div>
          <h3 className="mb-2 text-xs text-muted-foreground">{t("투표 결과")}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.participants.map((id) => {
              const target = s.votes?.[id];
              return (
                <li key={id} className="flex items-center gap-2 border-2 border-border bg-card px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{nameOf(id)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-right",
                      !target && "text-muted-foreground",
                      target === s.liarId && "font-semibold text-pop-green",
                    )}
                  >
                    {target ? nameOf(target) : t("기권")}
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
