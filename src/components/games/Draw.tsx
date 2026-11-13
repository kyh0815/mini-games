"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Label11, Panel, Screen } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { LedTimer } from "@/components/arcade/timer";
import { Check, Eraser, Pencil, Send, Trash, Undo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COLOR_NAMES, DRAW_COLORS, ERASER_SIZE, PAPER, PEN_SIZE, SIZE_MAX, SIZE_MIN } from "@/lib/draw";
import { drawStore } from "@/lib/draw-store";
import { useLang, useT } from "@/lib/i18n";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DrawCanvas } from "./DrawCanvas";
import { Lobby, Option, RankRow, Result, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "draw" }>;

/** 글자 수만큼의 빈칸. 힌트가 열리면 초성(일본어는 첫 글자)이 채워집니다. */
function Mask({ text }: { text: string }) {
  const t = useT();
  return (
    <span className="flex flex-wrap justify-center gap-1.5" aria-label={t("{n}글자", { n: Array.from(text).length })}>
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
  const t = useT();
  const lang = useLang();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const lastId = s.chat[s.chat.length - 1]?.id ?? 0;
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [lastId]);

  // 그리는 사람만 그리는 동안 채팅이 막힙니다. (답을 알려 줄 수 있어서)
  const blocked = s.phase === "draw" && s.youAreDrawer;
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
          <li className="m-auto text-center text-muted-foreground">{t("정답을 여기에 입력하세요.")}</li>
        )}
        {s.chat.map((m) =>
          m.kind === "chat" ? (
            <li key={m.id} className="break-all">
              <span className="font-semibold">{nameOf(m.playerId)}</span>{" "}
              <span className="text-foreground/80">{m.text}</span>
            </li>
          ) : (
            <li
              key={m.id}
              className={cn(
                "animate-rise font-semibold",
                m.kind === "correct" ? "text-pop-green" : "text-pop-yellow",
              )}
            >
              {m.kind === "correct"
                ? t("{name} 님 정답! +{points}점", { name: nameOf(m.playerId), points: m.points })
                : t("시간 종료. 정답은 '{word}'", { word: m.word[lang] })}
            </li>
          ),
        )}
      </ol>
      <form onSubmit={submit} className="flex gap-2 border-t-2 border-ink p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            blocked ? t("그리는 중에는 채팅할 수 없습니다") : t("정답 또는 채팅")
          }
          aria-label={t("정답 또는 채팅")}
          maxLength={30}
          autoComplete="off"
          disabled={blocked}
          className="h-10"
        />
        <Button type="submit" size="icon" variant="game" disabled={blocked} aria-label={t("보내기")}>
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
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t-2 border-ink bg-card p-3">
      <div role="radiogroup" aria-label={t("색")} className="flex gap-1.5">
        {DRAW_COLORS.map((c, i) => {
          const on = !eraser && color === c;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={on}
              // 색 이름은 자료에서 오므로 그대로 넘겨 옮깁니다.
              aria-label={t(COLOR_NAMES[i])}
              onClick={() => {
                onEraser(false);
                onColor(c);
              }}
              style={{ backgroundColor: c }}
              className={cn(
                "size-7 border-2 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring",
                on ? "-translate-y-1 border-foreground" : "border-ink hover:-translate-y-0.5",
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        {/* 지금 굵기와 색을 실제 크기에 가깝게 보여 줍니다 */}
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center border-2 border-ink bg-[#f3efe4]">
          <span
            className="rounded-full"
            style={{
              width: Math.min(34, size * 0.75),
              height: Math.min(34, size * 0.75),
              backgroundColor: eraser ? "transparent" : color,
              boxShadow: eraser ? "inset 0 0 0 2px #1d1d21" : undefined,
            }}
          />
        </span>
        <Slider
          aria-label={eraser ? t("지우개 굵기") : t("붓 굵기")}
          min={SIZE_MIN}
          max={SIZE_MAX}
          step={1}
          value={[size]}
          onValueChange={([v]) => onSize(v)}
          className="w-32"
        />
        <span className="w-6 text-sm text-muted-foreground tabular-nums">{size}</span>
      </div>
      <div className="ml-auto flex gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={eraser ? "secondary" : "outline"}
              size="icon"
              aria-label={t("지우개")}
              aria-pressed={eraser}
              onClick={() => onEraser(!eraser)}
            >
              {eraser ? <Pencil /> : <Eraser />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{eraser ? t("펜으로") : t("지우개")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("되돌리기")}
              onClick={() => {
                drawStore.undo();
                send({ type: "undo" });
              }}
            >
              <Undo />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("되돌리기")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("전체 지우기")}
              onClick={() => {
                drawStore.reset([]);
                send({ type: "clear" });
              }}
            >
              <Trash />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("전체 지우기")}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function Draw({ view, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const t = useT();
  const lang = useLang();
  const [category, setCategory] = useState("all");
  const [cycles, setCycles] = useState("1");
  const [drawSeconds, setDrawSeconds] = useState("80");
  const [color, setColor] = useState(DRAW_COLORS[0]);
  // 펜과 지우개는 굵기를 따로 기억합니다.
  const [penSize, setPenSize] = useState(PEN_SIZE);
  const [eraserSize, setEraserSize] = useState(ERASER_SIZE);
  const [eraser, setEraser] = useState(false);
  const size = eraser ? eraserSize : penSize;

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
        <Option label={t("한 사람당 그리는 횟수")}>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label={t("한 사람당 그리는 횟수")}
            value={cycles}
            onValueChange={(v) => v && setCycles(v)}
          >
            {["1", "2", "3"].map((n) => (
              <ToggleGroupItem key={n} value={n}>
                {t("{n}번", { n })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Option>
        <Option label={t("그리는 시간")}>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label={t("그리는 시간")}
            value={drawSeconds}
            onValueChange={(v) => v && setDrawSeconds(v)}
          >
            {["60", "80", "100"].map((n) => (
              <ToggleGroupItem key={n} value={n}>
                {t("{n}초", { n })}
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
        title={hasWinner ? t("{name} 우승", { name: top.name }) : t("무승부")}
        subtitle={hasWinner ? t("{n}점", { n: top.score }) : t("아무도 점수를 얻지 못했습니다.")}
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
                  {s.youAreDrawer ? t("그릴 단어를 고르세요") : t("{name} 님이 단어를 고르는 중…", { name: drawer })}
                </span>
              ) : s.word ? (
                <span className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">
                    {s.phase === "reveal" ? t("정답") : t("제시어")}
                  </span>
                  <span className="font-pixel fs-2 text-game">{s.word[lang]}</span>
                </span>
              ) : (
                <Mask text={s.mask[lang]} />
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
            size={size}
          />
          {s.phase === "choose" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-inset/95 p-6 text-center">
              {s.choices ? (
                <>
                  <p className="text-sm text-muted-foreground">{t("그리기 쉬운 단어를 고르세요.")}</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {s.choices.map((word, i) => (
                      <Button key={word.ko} variant="game" size="lg" onClick={() => send({ type: "choose", index: i })}>
                        {word[lang]}
                      </Button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <PixelAvatar seed={s.drawerId ?? ""} className="size-14" />
                  <p className="font-semibold">{t("{name} 님이 그릴 차례입니다", { name: drawer })}</p>
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
            onSize={eraser ? setEraserSize : setPenSize}
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
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("나")}</span>
                    )}
                  </span>
                  {p.id === s.drawerId ? (
                    <Pencil aria-label={t("그리는 사람")} className="size-4 text-game" />
                  ) : (
                    p.id in s.guessed && <Check aria-label={t("맞힘")} className="size-4 text-pop-green" />
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
