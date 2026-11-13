"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Label11, Panel, Screen } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { LedTimer } from "@/components/arcade/timer";
import { Check, Eraser, Pencil, Send, Trash, Undo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COLOR_NAMES, DRAW_COLORS, DRAW_SIZES, ERASER_SIZE, PAPER } from "@/lib/draw";
import { drawStore } from "@/lib/draw-store";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DrawCanvas } from "./DrawCanvas";
import { Lobby, Option, RankRow, Result, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "draw" }>;

/** 글자 수만큼의 빈칸. 힌트가 열리면 초성이 채워집니다. */
function Mask({ text }: { text: string }) {
  return (
    <span className="flex flex-wrap justify-center gap-1.5" aria-label={`${Array.from(text).length}글자`}>
      {Array.from(text).map((ch, i) =>
        ch === " " ? (
          <span key={i} className="w-3" />
        ) : (
          <span
            key={i}
            className="font-pixel flex h-9 w-8 items-end justify-center border-b-2 border-foreground/70 pb-0.5 fs-2 text-foreground"
          >
            {ch === "_" ? "" : ch}
          </span>
        ),
      )}
    </span>
  );
}

function Chat({ view, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const [text, setText] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const lastId = s.chat[s.chat.length - 1]?.id ?? 0;
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [lastId]);

  const drawing = s.phase === "draw";
  const guessed = view.you in s.guessed;
  const blocked = drawing && (s.youAreDrawer || guessed);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || blocked) return;
    const value = text;
    setText("");
    await send({ type: "guess", text: value });
  };

  return (
    <Panel label="CHAT" className="flex min-h-0 flex-col">
      <ol ref={listRef} className="flex h-56 flex-col gap-1 overflow-y-auto p-3 text-sm lg:h-72">
        {s.chat.length === 0 && (
          <li className="m-auto text-center text-muted-foreground">정답을 여기에 입력하세요.</li>
        )}
        {s.chat.map((m) =>
          m.kind === "chat" ? (
            <li key={m.id} className="break-all">
              <span className="font-semibold">{nameOf(m.playerId)}</span>{" "}
              <span className="text-muted-foreground">{m.text}</span>
            </li>
          ) : (
            <li
              key={m.id}
              className={cn(
                "animate-rise font-semibold",
                m.kind === "correct" ? "text-pop-green" : "text-pop-yellow",
              )}
            >
              {m.text}
            </li>
          ),
        )}
      </ol>
      <form onSubmit={submit} className="flex gap-2 border-t-2 border-ink p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            !blocked ? "정답 또는 채팅" : s.youAreDrawer ? "그리는 중에는 채팅할 수 없습니다" : "정답을 맞혔습니다"
          }
          aria-label="정답 또는 채팅"
          maxLength={30}
          autoComplete="off"
          disabled={blocked}
          className="h-10"
        />
        <Button type="submit" size="icon" variant="game" disabled={blocked} aria-label="보내기">
          <Send />
        </Button>
      </form>
    </Panel>
  );
}

function Toolbar({
  color,
  size,
  eraser,
  onColor,
  onSize,
  onEraser,
  send,
}: {
  color: string;
  size: number;
  eraser: boolean;
  onColor: (c: string) => void;
  onSize: (s: number) => void;
  onEraser: (on: boolean) => void;
  send: GameProps["send"];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t-2 border-ink bg-card p-3">
      <div role="radiogroup" aria-label="색" className="flex gap-1.5">
        {DRAW_COLORS.map((c, i) => {
          const on = !eraser && color === c;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={COLOR_NAMES[i]}
              onClick={() => {
                onEraser(false);
                onColor(c);
              }}
              style={{ backgroundColor: c }}
              className={cn(
                "size-8 border-2 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring",
                on ? "-translate-y-1 border-foreground" : "border-ink hover:-translate-y-0.5",
              )}
            />
          );
        })}
      </div>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label="굵기"
        value={String(size)}
        onValueChange={(v) => v && onSize(Number(v))}
      >
        {DRAW_SIZES.map((n, i) => (
          <ToggleGroupItem key={n} value={String(n)} aria-label={["가늘게", "보통", "굵게"][i]} className="min-w-10 px-0">
            <span className="rounded-full bg-current" style={{ width: 4 + i * 5, height: 4 + i * 5 }} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="ml-auto flex gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={eraser ? "secondary" : "outline"}
              size="icon"
              aria-label="지우개"
              aria-pressed={eraser}
              onClick={() => onEraser(!eraser)}
            >
              {eraser ? <Pencil /> : <Eraser />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{eraser ? "펜으로" : "지우개"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="되돌리기"
              onClick={() => {
                drawStore.undo();
                send({ type: "undo" });
              }}
            >
              <Undo />
            </Button>
          </TooltipTrigger>
          <TooltipContent>되돌리기</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="전체 지우기"
              onClick={() => {
                drawStore.reset([]);
                send({ type: "clear" });
              }}
            >
              <Trash />
            </Button>
          </TooltipTrigger>
          <TooltipContent>전체 지우기</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function Draw({ view, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const [category, setCategory] = useState("all");
  const [cycles, setCycles] = useState("1");
  const [drawSeconds, setDrawSeconds] = useState("80");
  const [color, setColor] = useState(DRAW_COLORS[0]);
  const [size, setSize] = useState(DRAW_SIZES[1]);
  const [eraser, setEraser] = useState(false);

  if (s.phase === "lobby") {
    return (
      <Lobby
        view={view}
        send={send}
        onStart={() =>
          send({
            type: "start",
            category,
            cycles: Number(cycles),
            drawSeconds: Number(drawSeconds),
          })
        }
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
        <Option label="한 사람당 그리는 횟수">
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label="한 사람당 그리는 횟수"
            value={cycles}
            onValueChange={(v) => v && setCycles(v)}
          >
            {["1", "2", "3"].map((n) => (
              <ToggleGroupItem key={n} value={n}>
                {n}번
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Option>
        <Option label="그리는 시간">
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label="그리는 시간"
            value={drawSeconds}
            onValueChange={(v) => v && setDrawSeconds(v)}
          >
            {["60", "80", "100"].map((n) => (
              <ToggleGroupItem key={n} value={n}>
                {n}초
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

  if (s.phase === "result") {
    const top = ranking[0];
    const hasWinner = !!top && top.score > 0;
    return (
      <Result
        view={view}
        send={send}
        tone={!hasWinner ? "neutral" : top.id === view.you ? "win" : "lose"}
        title={hasWinner ? `${top.name} 우승` : "무승부"}
        subtitle={hasWinner ? `${top.score}점` : "아무도 점수를 얻지 못했습니다."}
      >
        <ol className="flex flex-col gap-2">
          {ranking.map((p, i) => (
            <RankRow key={p.id} rank={i + 1} id={p.id} name={p.name} you={p.id === view.you}>
              <span className="font-pixel fs-15 text-foreground tabular-nums">{p.score}</span>
            </RankRow>
          ))}
        </ol>
      </Result>
    );
  }

  const canDraw = s.phase === "draw" && s.youAreDrawer;
  const drawer = nameOf(s.drawerId);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Screen>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <Label11 className="shrink-0 tabular-nums">
              TURN {s.turn}/{s.totalTurns}
            </Label11>
            <div className="flex min-w-0 flex-1 justify-center">
              {s.phase === "choose" ? (
                <span className="truncate text-sm text-muted-foreground">
                  {s.youAreDrawer ? "그릴 단어를 고르세요" : `${drawer} 님이 단어를 고르는 중…`}
                </span>
              ) : s.word ? (
                <span className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">
                    {s.phase === "reveal" ? "정답" : s.youAreDrawer ? "제시어" : "정답!"}
                  </span>
                  <span className="font-pixel fs-2 text-game">{s.word}</span>
                </span>
              ) : (
                <Mask text={s.mask} />
              )}
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
              <Pencil className="size-4" />
              <span className="max-w-24 truncate">{drawer}</span>
            </span>
          </div>
          <LedTimer deadline={s.deadline} totalMs={s.totalMs} tick={s.phase === "draw"} />
        </div>

        <div className="relative border-t-2 border-ink">
          <DrawCanvas
            code={view.code}
            canDraw={canDraw}
            color={eraser ? PAPER : color}
            size={eraser ? ERASER_SIZE : size}
          />
          {s.phase === "choose" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-inset/95 p-6 text-center">
              {s.choices ? (
                <>
                  <p className="text-sm text-muted-foreground">그리기 쉬운 단어를 고르세요.</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {s.choices.map((word, i) => (
                      <Button key={word} variant="game" size="lg" onClick={() => send({ type: "choose", index: i })}>
                        {word}
                      </Button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <PixelAvatar seed={s.drawerId ?? ""} className="size-14" />
                  <p className="font-semibold">{drawer} 님이 그릴 차례입니다</p>
                </>
              )}
            </div>
          )}
        </div>

        {canDraw && (
          <Toolbar
            color={color}
            size={size}
            eraser={eraser}
            onColor={setColor}
            onSize={setSize}
            onEraser={setEraser}
            send={send}
          />
        )}
      </Screen>

      <div className="flex flex-col gap-5">
        <Panel label="SCORE">
          <ol className="flex flex-col gap-1.5 p-3">
            {ranking.map((p) => {
              const gain = p.id === s.drawerId ? s.drawerGain : s.guessed[p.id];
              return (
                <li
                  key={p.id}
                  className={cn(
                    "flex h-9 items-center gap-2.5 border-2 px-2",
                    p.id === s.drawerId ? "border-game bg-accent" : "border-transparent",
                    !p.online && "opacity-45",
                  )}
                >
                  <PixelAvatar seed={p.id} className="size-6" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {p.name}
                    {p.id === view.you && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">나</span>
                    )}
                  </span>
                  {p.id === s.drawerId ? (
                    <Pencil aria-label="그리는 사람" className="size-4 text-game" />
                  ) : (
                    p.id in s.guessed && <Check aria-label="맞힘" className="size-4 text-pop-green" />
                  )}
                  {gain ? <span className="text-xs text-pop-green tabular-nums">+{gain}</span> : null}
                  <span className="font-pixel w-9 text-right fs-15 tabular-nums">{p.score}</span>
                </li>
              );
            })}
          </ol>
        </Panel>
        <Chat view={view} send={send} nameOf={nameOf} />
      </div>
    </div>
  );
}
