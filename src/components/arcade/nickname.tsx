"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { post } from "@/lib/client";
import { reconnectLobby, setLobbyYou, useLobby } from "@/lib/lobby-store";

// 닉네임 창은 헤더, 방 만들기, 방 입장 등 여러 곳에서 열 수 있어 열림 상태를 한곳에 둡니다.
let open = false;
let waiters: ((ok: boolean) => void)[] = [];
const listeners = new Set<() => void>();

function setOpen(next: boolean): void {
  open = next;
  listeners.forEach((fn) => fn());
  if (!next) {
    // 닫히면 기다리던 쪽에 결과를 알립니다. 저장에 성공한 경우는 그 전에 이미 처리됩니다.
    waiters.forEach((resolve) => resolve(false));
    waiters = [];
  }
}

export function openNickname(): void {
  setOpen(true);
}

/** 닉네임이 필요한 동작 전에 부릅니다. 닉네임이 생기면 true, 창을 그냥 닫으면 false. */
export function askNickname(): Promise<boolean> {
  return new Promise((resolve) => {
    waiters.push(resolve);
    setOpen(true);
  });
}

export function NicknameDialog() {
  const lobby = useLobby();
  const isOpen = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => open,
    () => false,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // 처음 온 사람에게는 한 번 먼저 물어봅니다.
  const prompted = useRef(false);
  useEffect(() => {
    if (lobby.ready && !lobby.you && !prompted.current) {
      prompted.current = true;
      setOpen(true);
    }
  }, [lobby.ready, lobby.you]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = inputRef.current?.value.trim() ?? "";
    if (!name) return inputRef.current?.focus();
    setBusy(true);
    try {
      const you = await post<{ id: string; name: string }>("/api/me", { name });
      setLobbyYou(you);
      reconnectLobby();
      waiters.forEach((resolve) => resolve(true));
      waiters = [];
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lobby.you ? "닉네임 바꾸기" : "닉네임 정하기"}</DialogTitle>
          <DialogDescription>
            방과 접속자 목록에 이 이름으로 표시됩니다. 언제든 바꿀 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            ref={inputRef}
            key={lobby.you?.name ?? ""}
            defaultValue={lobby.you?.name ?? ""}
            aria-label="닉네임"
            placeholder="닉네임 (1~12자)"
            maxLength={12}
            autoComplete="off"
            autoFocus
          />
          <Button type="submit" disabled={busy}>
            {lobby.you ? "바꾸기" : "시작하기"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
