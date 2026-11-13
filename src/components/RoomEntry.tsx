"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { post, saveName, saveToken, savedName } from "@/lib/client";
import type { GameSlug } from "@/lib/games";
import { Button, Input } from "./ui";

/** 게임 소개 페이지의 '방 만들기' */
export function CreateRoom({ game }: { game: GameSlug }) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nameRef.current && !nameRef.current.value) nameRef.current.value = savedName();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = nameRef.current?.value.trim() ?? "";
    if (!name) return setError("이름을 입력해 주세요.");
    setBusy(true);
    try {
      const res = await post<{ code: string; token: string }>("/api/rooms", { game, name });
      saveName(name);
      saveToken(res.code, res.token);
      router.push(`/rooms/${res.code}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input ref={nameRef} placeholder="내 이름 (1~12자)" maxLength={12} />
        <Button type="submit" disabled={busy} className="shrink-0">
          방 만들기
        </Button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </form>
  );
}

/** 홈 화면의 '코드로 입장' */
export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length === 4) router.push(`/rooms/${clean}`);
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        placeholder="방 코드 4자리"
        maxLength={4}
        className="w-40 font-mono tracking-widest"
        autoComplete="off"
      />
      <Button type="submit" variant="ghost" disabled={code.length !== 4} className="shrink-0">
        입장
      </Button>
    </form>
  );
}
