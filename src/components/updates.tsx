"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { Mascot } from "@/components/arcade/mascot";
import { Label11, Panel } from "@/components/arcade/panel";
import { ArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { LATEST_VERSION, RELEASES, type ReleaseKind } from "@/lib/releases";
import { cn } from "@/lib/utils";

// 마지막으로 읽은 소식의 버전을 이 기기에 기억해 두고, 새 소식이 있으면 헤더에 표시합니다.
const SEEN_KEY = "mg_seen_release";
const listeners = new Set<() => void>();

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return LATEST_VERSION;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, LATEST_VERSION);
  } catch {
    // 기억하지 못하면 표시가 계속 남을 뿐입니다.
  }
  listeners.forEach((fn) => fn());
}

/** 아직 읽지 않은 소식이 있는지 */
export function useUnreadUpdates(): boolean {
  const seen = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    readSeen,
    () => LATEST_VERSION,
  );
  return seen !== LATEST_VERSION;
}

const KINDS: Record<ReleaseKind, { label: string; className: string }> = {
  new: { label: "새로움", className: "bg-pop-green" },
  change: { label: "바뀜", className: "bg-pop-blue" },
  fix: { label: "고침", className: "bg-pop-pink" },
};

/** 업데이트 소식 게시판 */
export function UpdatesBoard() {
  const t = useT();
  useEffect(markSeen, []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon" aria-label={t("로비로 돌아가기")}>
          <Link href="/">
            <ArrowLeft />
          </Link>
        </Button>
        <Mascot mood="happy" blink className="w-9" />
        <div className="flex min-w-0 flex-col">
          <Label11 className="text-pop-yellow">NOTICE BOARD</Label11>
          <h1 className="font-pixel fs-2 text-foreground">{t("업데이트 소식")}</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("무엇이 새로 생기고 바뀌었는지 여기에 적어 둡니다.")}
      </p>

      <ol className="flex flex-col gap-5">
        {RELEASES.map((release, i) => (
          <li key={release.version}>
            <Panel
              label={
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="text-foreground">v{release.version}</span>
                  <span>{release.date}</span>
                </span>
              }
              action={
                i === 0 ? (
                  <span className="font-pixel bg-pop-yellow px-1.5 py-0.5 fs-1 text-ink">{t("최신")}</span>
                ) : undefined
              }
            >
              <div className="flex flex-col gap-4 p-4 sm:p-5">
                <h2 className="font-pixel fs-15 text-foreground">{t(release.title)}</h2>
                <ul className="flex flex-col gap-2.5">
                  {release.items.map((item) => (
                    <li key={item.text} className="flex items-start gap-3 text-sm/relaxed">
                      <span
                        className={cn(
                          "font-pixel mt-0.5 w-14 shrink-0 border-2 border-ink py-0.5 text-center fs-1 text-ink",
                          KINDS[item.kind].className,
                        )}
                      >
                        {t(KINDS[item.kind].label)}
                      </span>
                      <span className="text-muted-foreground">{t(item.text)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </li>
        ))}
      </ol>
    </main>
  );
}
