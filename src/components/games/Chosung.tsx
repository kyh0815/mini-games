"use client";

import { useState, type FormEvent } from "react";
import type { RoomView } from "@/lib/types";
import { Button, Card, Field, Input, Select, TimeBar } from "../ui";
import { BackToLobby, Lobby, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "chosung" }>;

export function Chosung({ view, now, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const [category, setCategory] = useState("all");
  const [rounds, setRounds] = useState(10);
  const [text, setText] = useState("");

  if (s.phase === "lobby") {
    return (
      <Lobby view={view} onStart={() => send({ type: "start", category, rounds })}>
        <Field label="주제">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">전체</option>
            {s.categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="문제 수">
          <Select value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
            {[5, 10, 15].map((n) => (
              <option key={n} value={n}>
                {n}문제
              </option>
            ))}
          </Select>
        </Field>
      </Lobby>
    );
  }

  const ranking = view.players
    .map((p) => ({ ...p, score: s.scores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const scoreboard = (
    <Card>
      <h2 className="mb-3 font-medium">점수</h2>
      <ol className="flex flex-col gap-1.5 text-sm">
        {ranking.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3">
            <span className="w-5 text-zinc-400 tabular-nums">{i + 1}</span>
            <span className="flex-1 truncate">{p.name}</span>
            <span className="font-medium tabular-nums">{p.score}점</span>
          </li>
        ))}
      </ol>
    </Card>
  );

  if (s.phase === "result") {
    const top = ranking[0];
    return (
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-zinc-500">퀴즈 종료</p>
          <p className="text-2xl font-semibold">
            {top && top.score > 0 ? `🏆 ${top.name} 우승!` : "아무도 점수를 얻지 못했습니다"}
          </p>
          <BackToLobby view={view} send={send} />
        </Card>
        {scoreboard}
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    send({ type: "answer", text });
    setText("");
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-5">
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            {s.round} / {s.totalRounds}
          </span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {s.category}
          </span>
        </div>
        <p className="py-4 text-center text-5xl font-bold tracking-[0.3em] sm:text-7xl">
          {s.answer ?? s.chosung}
        </p>
        {s.phase === "question" ? (
          <>
            <p className="h-5 text-center text-sm text-zinc-500">
              {s.hint && `힌트: '${s.hint}'(으)로 시작합니다`}
            </p>
            <TimeBar now={now} deadline={s.deadline} totalMs={20_000} />
            <form onSubmit={submit} className="flex gap-2">
              <Input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="정답 입력"
                maxLength={20}
                autoComplete="off"
              />
              <Button type="submit">제출</Button>
            </form>
            <ul className="flex min-h-6 flex-wrap gap-2 text-sm text-zinc-500">
              {s.guesses.map((g, i) => (
                <li key={i} className="rounded-md bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                  {nameOf(g.playerId)}: <span className="line-through">{g.text}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-center text-lg">
            {s.winnerId ? `✅ ${nameOf(s.winnerId)} 정답!` : "⏰ 아무도 맞히지 못했습니다"}
          </p>
        )}
      </Card>
      {scoreboard}
    </div>
  );
}
