import type { ComponentType, SVGProps } from "react";
import { EyeOff, Keyboard, LinkIcon, MessageText, Pencil } from "@/components/icons";
import type { GameSlug } from "@/lib/games";
import { cn } from "@/lib/utils";

const ICONS: Record<GameSlug, ComponentType<SVGProps<SVGSVGElement>>> = {
  draw: Pencil,
  chosung: MessageText,
  liar: EyeOff,
  typing: Keyboard,
  wordchain: LinkIcon,
};

/** 게임 대표색 바탕의 네모 아이콘. 게임을 구분하는 표식으로 씁니다. */
export function GameIcon({ game, className }: { game: GameSlug; className?: string }) {
  const Icon = ICONS[game];
  return (
    <span
      data-game={game}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center border-2 border-ink bg-game text-ink",
        className,
      )}
    >
      <Icon className="size-[62%]" />
    </span>
  );
}
