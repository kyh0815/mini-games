"use client";

import Link from "next/link";
import { Bell, User } from "@/components/icons";
import { useUnreadUpdates } from "@/components/updates";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useLobby } from "@/lib/lobby-store";
import { BrandMark } from "./mascot";
import { openNickname } from "./nickname";
import { NoticeBar } from "./notice";
import { PixelAvatar } from "./pixel-avatar";
import { SettingsControl } from "./sound";

export function Header() {
  const lobby = useLobby();
  const t = useT();
  const unread = useUnreadUpdates();
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark className="h-8" />
          <span className="font-pixel fs-1 leading-none whitespace-nowrap text-foreground min-[400px]:fs-15 min-[400px]:leading-none sm:fs-2 sm:leading-none">
            MINI GAME HEAVEN
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {lobby.ready && (
            <Button
              variant="outline"
              onClick={openNickname}
              aria-label={lobby.you ? t("닉네임 바꾸기") : t("닉네임 정하기")}
              className="max-w-36 gap-2 px-2.5 sm:max-w-44"
            >
              {lobby.you ? (
                <PixelAvatar seed={lobby.you.id} className="size-6 border-0" />
              ) : (
                <User />
              )}
              <span className="hidden truncate sm:inline">{lobby.you?.name ?? t("닉네임 정하기")}</span>
            </Button>
          )}
          <Button asChild variant="outline" size="icon" aria-label={unread ? t("새 소식이 있습니다") : t("업데이트 소식")}>
            <Link href="/updates" className="relative">
              <Bell />
              {unread && (
                <span aria-hidden className="absolute -top-1 -right-1 size-2.5 border-2 border-ink bg-pop-red" />
              )}
            </Link>
          </Button>
          <SettingsControl />
        </div>
      </div>
      <NoticeBar />
    </header>
  );
}
