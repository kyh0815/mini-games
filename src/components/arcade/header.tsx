import Link from "next/link";
import { Joystick } from "@/components/icons";
import { SoundControl } from "./sound";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-10 items-center justify-center border-2 border-ink bg-neon-pink text-ink pixel-shadow transition-transform group-hover:-translate-y-0.5">
            <Joystick className="size-6" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-pixel fs-2 text-neon-pink neon-text">MINI ARCADE</span>
            <span className="font-pixel mt-1 fs-1 text-muted-foreground">미니게임 오락실</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-pixel hidden fs-1 text-neon-yellow sm:inline">
            CREDIT <span className="tabular-nums">99</span>
          </span>
          <SoundControl />
        </div>
      </div>
    </header>
  );
}
