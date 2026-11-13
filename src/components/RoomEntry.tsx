"use client";

import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Coins, Play } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { audio } from "@/lib/audio";
import { post, saveName, savedName } from "@/lib/client";
import type { GameSlug } from "@/lib/games";

/** 게임 소개 페이지의 '방 만들기' */
export function CreateRoom({ game }: { game: GameSlug }) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (nameRef.current && !nameRef.current.value) nameRef.current.value = savedName();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = nameRef.current?.value.trim() ?? "";
    if (!name) {
      toast.error("이름을 입력해 주세요.");
      nameRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await post<{ code: string }>("/api/rooms", { game, name });
      saveName(name);
      audio.play("coin");
      router.push(`/rooms/${res.code}`);
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="player-name">플레이어 이름</Label>
        <Input
          id="player-name"
          ref={nameRef}
          placeholder="이름 (1~12자)"
          maxLength={12}
          autoComplete="off"
        />
      </div>
      <Button type="submit" variant="coin" size="lg" disabled={busy} className="w-full">
        <Coins />
        {busy ? "LOADING…" : "방 만들기"}
      </Button>
    </form>
  );
}

/** 홈 화면의 '코드로 입장' */
export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const go = (value: string) => {
    if (value.length === 4) router.push(`/rooms/${value}`);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(code);
      }}
      className="flex items-end gap-3"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="room-code" className="font-pixel fs-1">
          ROOM CODE
        </Label>
        <InputOTP
          id="room-code"
          maxLength={4}
          value={code}
          onChange={(value) => setCode(value.toUpperCase())}
          onComplete={(value: string) => go(value.toUpperCase())}
          pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
          inputMode="text"
          autoComplete="off"
          aria-label="방 코드 4자리"
        >
          <InputOTPGroup>
            {[0, 1, 2, 3].map((i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button type="submit" variant="secondary" className="h-12" disabled={code.length !== 4}>
        <Play />
        입장
      </Button>
    </form>
  );
}
