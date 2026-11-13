"use client";

import { useState, type FormEvent } from "react";
import { Panel, Screen } from "@/components/arcade/panel";
import { LedTimer } from "@/components/arcade/timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GameTag, Lobby, Option, RankRow, Result, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "chosung" }>;

export function Chosung({ view, now, send, nameOf }: GameProps<View>) {
  const s = view.state;
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
        <Option label="주제">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40" aria-label="주제">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {s.categories.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Option>
        <Option label="문제 수">
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label="문제 수"
            value={rounds}
            onValueChange={(v) => v && setRounds(v)}
          >
            {["5", "10", "15"].map((n) => (
              <ToggleGroupItem key={n} value={n}>
                {n}
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
          <span className="font-pixel fs-15 text-neon-yellow tabular-nums">
            {String(p.score).padStart(2, "0")}
          </span>
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
        tone={hasWinner ? "win" : "neutral"}
        title={hasWinner ? `${top.name} WIN!` : "DRAW"}
        subtitle={hasWinner ? `${top.score}문제를 맞혔습니다.` : "아무도 점수를 얻지 못했습니다."}
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
    <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
      <Screen>
        <div className="flex flex-col gap-6 p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <span className="font-pixel fs-15 text-muted-foreground">
              ROUND <span className="text-foreground tabular-nums">{s.round}</span>/{s.totalRounds}
            </span>
            <GameTag>{s.category}</GameTag>
          </div>

          <div className="flex min-h-40 flex-col items-center justify-center gap-4">
            <p
              key={`${s.round}-${s.phase}`}
              className={cn(
                "font-pixel animate-pop text-center fs-4 tracking-[0.25em] neon-text sm:fs-6",
                asking ? "text-game" : s.winnerId ? "text-neon-green" : "text-neon-red",
              )}
            >
              {s.answer ?? s.chosung}
            </p>
            <p className="font-pixel h-6 fs-15 text-neon-yellow">
              {asking
                ? s.hint && `HINT: '${s.hint}'(으)로 시작`
                : s.winnerId
                  ? `${nameOf(s.winnerId)} 정답!`
                  : "TIME UP"}
            </p>
          </div>

          <LedTimer now={now} deadline={s.deadline} totalMs={asking ? 20_000 : 3_500} tick={asking} />

          <form onSubmit={submit} className="flex gap-3">
            <Input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={asking ? "정답 입력" : "다음 문제 준비 중…"}
              aria-label="정답"
              maxLength={20}
              autoComplete="off"
              disabled={!asking}
            />
            <Button type="submit" variant="game" disabled={!asking}>
              제출
            </Button>
          </form>

          <ul className="flex min-h-8 flex-wrap gap-2" aria-label="오답">
            {asking &&
              s.guesses.map((g, i) => (
                <li
                  key={`${g.playerId}-${g.text}-${i}`}
                  className="animate-rise border-2 border-border bg-ink/60 px-2 py-0.5 text-sm text-muted-foreground"
                >
                  {nameOf(g.playerId)} <span className="text-neon-red line-through">{g.text}</span>
                </li>
              ))}
          </ul>
        </div>
      </Screen>
      <Panel label="SCORE" className="self-start">
        <div className="p-3">{scores}</div>
      </Panel>
    </div>
  );
}
