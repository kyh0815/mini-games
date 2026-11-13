"use client";

import { useState, type FormEvent } from "react";
import { Label11, Panel, Screen } from "@/components/arcade/panel";
import { LedTimer } from "@/components/arcade/timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/lib/i18n";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GameTag, Lobby, Option, RankRow, Result, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "chosung" }>;

export function Chosung({ view, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const t = useT();
  const [category, setCategory] = useState("all");
  const [rounds, setRounds] = useState("10");
  const [text, setText] = useState("");

  if (s.phase === "lobby") {
    return (
      <Lobby
        view={view}
        send={send}
        onStart={() => send({ type: "start", category, rounds: Number(rounds) })}
      >
        <Option label={t("주제")}>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40" aria-label={t("주제")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("전체")}</SelectItem>
              {s.categories.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {t(c.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Option>
        <Option label={t("문제 수")}>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label={t("문제 수")}
            value={rounds}
            onValueChange={(v) => v && setRounds(v)}
          >
            {["5", "10", "15"].map((n) => (
              <ToggleGroupItem key={n} value={n}>
                {t("{n}문제", { n })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Option>
      </Lobby>
    );
  }

  const ranking = view.players
    .map((p) => ({ ...p, score: s.scores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const scores = (
    <ol className="flex flex-col gap-2">
      {ranking.map((p, i) => (
        <RankRow key={p.id} rank={i + 1} id={p.id} name={p.name} you={p.id === view.you}>
          <span className="font-pixel fs-15 text-foreground tabular-nums">{p.score}</span>
        </RankRow>
      ))}
    </ol>
  );

  if (s.phase === "result") {
    const top = ranking[0];
    const hasWinner = !!top && top.score > 0;
    return (
      <Result
        view={view}
        send={send}
        tone={!hasWinner ? "neutral" : top.id === view.you ? "win" : "lose"}
        title={hasWinner ? t("{name} 우승", { name: top.name }) : t("무승부")}
        subtitle={hasWinner ? t("{n}문제를 맞혔습니다.", { n: top.score }) : t("아무도 점수를 얻지 못했습니다.")}
      >
        {scores}
      </Result>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    send({ type: "answer", text });
    setText("");
  };
  const asking = s.phase === "question";

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <Screen>
        <div className="flex flex-col gap-6 p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <Label11 className="tabular-nums">
              ROUND {s.round}/{s.totalRounds}
            </Label11>
            {/* 주제 이름은 서버가 한국어로 보내므로 그대로 넘겨 옮깁니다. */}
            <GameTag>{t(s.category)}</GameTag>
          </div>

          <div className="flex min-h-36 flex-col items-center justify-center gap-3">
            <p
              key={`${s.round}-${s.phase}`}
              className={cn(
                "font-pixel animate-pop text-center fs-4 tracking-[0.25em] sm:fs-6",
                asking ? "text-foreground" : s.winnerId ? "text-pop-green" : "text-muted-foreground",
              )}
            >
              {s.answer ?? s.chosung}
            </p>
            <p className="h-5 text-sm text-muted-foreground">
              {asking
                ? s.hint && t("힌트: '{hint}'(으)로 시작합니다", { hint: s.hint })
                : s.winnerId
                  ? t("{name} 님 정답", { name: nameOf(s.winnerId) })
                  : t("아무도 맞히지 못했습니다")}
            </p>
          </div>

          <LedTimer deadline={s.deadline} totalMs={asking ? 20_000 : 3_500} tick={asking} />

          <form onSubmit={submit} className="flex gap-3">
            <Input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={asking ? t("정답 입력") : t("다음 문제 준비 중…")}
              aria-label={t("정답")}
              maxLength={20}
              autoComplete="off"
              disabled={!asking}
            />
            <Button type="submit" variant="game" disabled={!asking}>
              {t("제출")}
            </Button>
          </form>

          <ul className="flex min-h-7 flex-wrap gap-2" aria-label={t("오답")}>
            {asking &&
              s.guesses.map((g, i) => (
                <li
                  key={`${g.playerId}-${g.text}-${i}`}
                  className="animate-rise border-2 border-border px-2 text-sm text-muted-foreground"
                >
                  {nameOf(g.playerId)} <span className="line-through">{g.text}</span>
                </li>
              ))}
          </ul>
        </div>
      </Screen>
      <Panel label="SCORE">
        <div className="p-3">{scores}</div>
      </Panel>
    </div>
  );
}
