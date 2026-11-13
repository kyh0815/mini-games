"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useState } from "react";
import { Label11, Panel, Screen } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { LedTimer } from "@/components/arcade/timer";
import { Check } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/lib/i18n";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Lobby, Option, Result, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "baseball" }>;

function DigitInput({
  digits,
  value,
  onChange,
  onSubmit,
  label,
}: {
  digits: number;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  label: string;
}) {
  return (
    <InputOTP
      maxLength={digits}
      value={value}
      onChange={onChange}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="off"
      autoFocus
      aria-label={label}
      onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && onSubmit()}
    >
      <InputOTPGroup>
        {Array.from({ length: digits }, (_, i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

/** 스트라이크·볼 판정 표시 */
function Verdict({ strike, ball, digits }: { strike: number; ball: number; digits: number }) {
  const t = useT();
  if (strike === digits) return <span className="font-semibold text-pop-green">{t("정답")}</span>;
  if (strike === 0 && ball === 0) return <span className="text-muted-foreground">{t("아웃")}</span>;
  return (
    <span className="flex gap-2 font-semibold tabular-nums">
      <span className="text-pop-green">{strike}S</span>
      <span className="text-pop-yellow">{ball}B</span>
    </span>
  );
}

export function Baseball({ view, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const t = useT();
  const [digits, setDigits] = useState("3");
  const [value, setValue] = useState("");

  if (s.phase === "lobby") {
    return (
      <Lobby view={view} send={send} onStart={() => send({ type: "start", digits: Number(digits) })}>
        <Option label={t("자릿수")}>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label={t("자릿수")}
            value={digits}
            onValueChange={(v) => v && setDigits(v)}
          >
            <ToggleGroupItem value="3">{t("3자리")}</ToggleGroupItem>
            <ToggleGroupItem value="4">{t("4자리")}</ToggleGroupItem>
          </ToggleGroup>
        </Option>
      </Lobby>
    );
  }

  const unique = new Set(value).size === value.length;
  const complete = value.length === s.digits && unique;
  const submit = async (type: "secret" | "guess") => {
    if (!complete) return;
    if (await send({ type, value })) setValue("");
  };
  const hint = value.length > 0 && !unique ? t("같은 숫자를 두 번 쓸 수 없습니다.") : null;

  if (s.phase === "setup") {
    return (
      <Screen className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center gap-6 p-6 text-center sm:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">{t("비밀 숫자를 정하세요")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("서로 다른 숫자 {n}개. 상대가 이 숫자를 맞혀야 합니다.", { n: s.digits })}
            </p>
          </div>
          {!s.youPlaying ? (
            <p className="text-sm text-muted-foreground">{t("두 사람이 숫자를 정하는 중입니다.")}</p>
          ) : s.yourSecret ? (
            <>
              <p className="font-pixel fs-4 tracking-[0.3em]">{s.yourSecret}</p>
              <p className="text-sm text-muted-foreground">{t("상대가 숫자를 정하기를 기다리는 중…")}</p>
            </>
          ) : (
            <>
              <DigitInput
                digits={s.digits}
                value={value}
                onChange={setValue}
                onSubmit={() => submit("secret")}
                label={t("비밀 숫자")}
              />
              <p className="h-5 text-sm text-pop-red">{hint}</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => send({ type: "random" })}>
                  {t("무작위로")}
                </Button>
                <Button variant="game" disabled={!complete} onClick={() => submit("secret")}>
                  {t("이 숫자로 정하기")}
                </Button>
              </div>
            </>
          )}
          <ul className="flex gap-3 text-sm">
            {s.players.map((id) => (
              <li key={id} className="flex items-center gap-2 border-2 border-border px-3 py-1.5">
                <PixelAvatar seed={id} className="size-6" />
                {nameOf(id)}
                {s.ready.includes(id) && <Check aria-label={t("정함")} className="size-4 text-pop-green" />}
              </li>
            ))}
          </ul>
          <div className="w-full">
            <LedTimer deadline={s.deadline} totalMs={s.totalMs} />
          </div>
        </div>
      </Screen>
    );
  }

  /** 한 사람의 추리 기록 */
  const column = (id: string) => {
    const rows = s.guesses.filter((g) => g.playerId === id);
    return (
      <Panel
        key={id}
        label={t("{name}의 추리", { name: nameOf(id) })}
        action={
          s.turnId === id ? <span className="text-xs font-semibold text-game">{t("차례")}</span> : undefined
        }
        className={cn(s.turnId === id && "border-game")}
      >
        <ol className="flex min-h-40 flex-col gap-1 p-3">
          {rows.length === 0 && (
            <li className="m-auto text-sm text-muted-foreground">{t("아직 추리가 없습니다.")}</li>
          )}
          {rows.map((g, i) => (
            <li key={i} className="flex h-9 items-center gap-3 border-2 border-border px-3 text-sm">
              <span className="font-pixel w-5 fs-1 text-muted-foreground">{i + 1}</span>
              <span className="font-pixel flex-1 fs-15 tracking-[0.25em]">{g.guess}</span>
              <Verdict strike={g.strike} ball={g.ball} digits={s.digits} />
            </li>
          ))}
        </ol>
      </Panel>
    );
  };

  if (s.phase === "result") {
    const draw = s.winnerId === null;
    return (
      <Result
        view={view}
        send={send}
        tone={draw || !s.youPlaying ? "neutral" : s.winnerId === view.you ? "win" : "lose"}
        title={draw ? t("무승부") : t("{name} 승리", { name: nameOf(s.winnerId) })}
        subtitle={draw ? t("둘 다 같은 횟수에 맞혔습니다.") : undefined}
      >
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-2.5">
            {s.players.map((id) => (
              <div key={id} className="border-2 border-border bg-card p-3">
                <dt className="text-xs text-muted-foreground">{t("{name}의 숫자", { name: nameOf(id) })}</dt>
                <dd className="font-pixel mt-1 fs-2 tracking-[0.25em]">{s.secrets?.[id]}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-4 sm:grid-cols-2">{s.players.map(column)}</div>
        </div>
      </Result>
    );
  }

  const myTurn = s.turnId === view.you;
  return (
    <div className="flex flex-col gap-5">
      <Screen>
        <div className="flex flex-col items-center gap-4 p-5 text-center sm:p-6">
          <div className="flex w-full items-center justify-between">
            <Label11>{s.lastChance ? "LAST CHANCE" : `TURN ${s.guesses.length + 1}`}</Label11>
            {s.youPlaying && s.yourSecret && (
              <span className="flex items-baseline gap-2 text-xs text-muted-foreground">
                {t("내 숫자")}
                <span className="font-pixel fs-15 tracking-[0.25em] text-foreground">{s.yourSecret}</span>
              </span>
            )}
          </div>
          {myTurn ? (
            <>
              <p className="text-sm font-semibold">
                {s.lastChance
                  ? t("상대가 먼저 맞혔습니다. 이번에 맞히면 무승부입니다.")
                  : t("상대의 숫자를 추리하세요")}
              </p>
              <DigitInput
                digits={s.digits}
                value={value}
                onChange={setValue}
                onSubmit={() => submit("guess")}
                label={t("추리")}
              />
              <p className="h-5 text-sm text-pop-red">{hint}</p>
              <Button variant="game" disabled={!complete} onClick={() => submit("guess")}>
                {t("던지기")}
              </Button>
            </>
          ) : (
            <p className="flex h-28 items-center text-sm text-muted-foreground">
              {t("{name} 님이 추리하는 중…", { name: nameOf(s.turnId) })}
            </p>
          )}
          <div className="w-full">
            <LedTimer deadline={s.deadline} totalMs={s.totalMs} tick={myTurn} />
          </div>
        </div>
      </Screen>
      <div className="grid gap-5 sm:grid-cols-2">{s.players.map(column)}</div>
    </div>
  );
}
