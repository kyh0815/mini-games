"use client";

import Link from "next/link";
import { User } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useLobby } from "@/lib/lobby-store";
import { openNickname } from "./nickname";
import { PixelAvatar } from "./pixel-avatar";
import { SoundControl } from "./sound";

export function Header() {
  const lobby = useLobby();
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* 로고: 조이스틱을 단순화한 픽셀 마크 */}
          <svg viewBox="0 0 8 8" aria-hidden shapeRendering="crispEdges" className="size-7">
            <rect width="8" height="8" className="fill-primary" />
            <path d="M3 1h2v2H3zM3.5 3h1v2h-1zM1 5h6v2H1z" className="fill-ink" />
          </svg>
          <span className="font-pixel fs-2 text-foreground">MINI ARCADE</span>
        </Link>
        <div className="flex items-center gap-2">
          {lobby.ready && (
            <Button variant="outline" onClick={openNickname} className="max-w-44 gap-2 px-2.5">
              {lobby.you ? (
                <PixelAvatar seed={lobby.you.id} className="size-6 border-0" />
              ) : (
                <User />
              )}
              <span className="truncate">{lobby.you?.name ?? "닉네임 정하기"}</span>
            </Button>
          )}
          <SoundControl />
        </div>
      </div>
    </header>
  );
}
