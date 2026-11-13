"use client";

import { useEffect, useRef } from "react";
import { Megaphone } from "@/components/icons";
import { audio } from "@/lib/audio";
import { useT } from "@/lib/i18n";
import { useLobby } from "@/lib/lobby-store";

/** 운영자 공지. 헤더 바로 아래에 붙어서 어느 화면에서든 보입니다. */
export function NoticeBar() {
  const { notice } = useLobby();
  const t = useT();
  const seen = useRef<number | null>(null);

  useEffect(() => {
    if (!notice || seen.current === notice.at) return;
    seen.current = notice.at;
    audio.play("turn");
  }, [notice]);

  if (!notice) return null;
  return (
    <div role="status" aria-live="polite" className="border-t-2 border-ink bg-pop-yellow text-ink">
      <div
        key={notice.at}
        className="mx-auto flex w-full max-w-6xl animate-[rise_0.25s_ease-out] items-center gap-2.5 px-4 py-2 sm:px-6"
      >
        <Megaphone aria-hidden className="size-5 shrink-0" />
        <span className="font-pixel fs-1 shrink-0 border-2 border-ink px-1.5 py-0.5">{t("공지")}</span>
        <p className="min-w-0 text-sm font-semibold break-keep">{notice.text}</p>
      </div>
    </div>
  );
}
