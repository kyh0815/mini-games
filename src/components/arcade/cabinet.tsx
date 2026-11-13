import Link from "next/link";
import { Joystick, Play, Users } from "@/components/icons";
import type { Game, GameSlug } from "@/lib/games";
import { cn } from "@/lib/utils";
import { Bulbs } from "./panel";
import { PixelAvatar } from "./pixel-avatar";

/** 오락기 화면에 흐르는 게임별 미리보기 */
function Attract({ slug }: { slug: GameSlug }) {
  switch (slug) {
    case "chosung":
      return (
        <div className="flex flex-col items-center gap-2">
          <p className="font-pixel fs-3 tracking-[0.3em] text-game neon-text">ㅇㄹㅅ</p>
          <p className="font-pixel fs-1 text-muted-foreground">
            정답은<span className="animate-blink text-neon-yellow"> ?</span>
          </p>
        </div>
      );
    case "liar":
      return (
        <div className="flex items-end gap-2">
          {["a1", "b7", "liar", "d4"].map((seed) =>
            seed === "liar" ? (
              <span
                key={seed}
                className="font-pixel flex size-11 animate-floaty items-center justify-center border-2 border-game bg-ink fs-2 text-game neon-text"
              >
                ?
              </span>
            ) : (
              <PixelAvatar key={seed} seed={seed} className="size-9" />
            ),
          )}
        </div>
      );
    case "typing":
      return (
        <div className="flex flex-col items-center gap-3">
          <p className="font-pixel fs-15 text-game neon-text">
            타닥타닥<span className="animate-blink">▌</span>
          </p>
          <div className="flex h-3 w-36 gap-0.5 border-2 border-ink bg-ink p-0.5">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className={cn("flex-1", i < 8 ? "bg-game" : "bg-muted/60")} />
            ))}
          </div>
        </div>
      );
    case "wordchain":
      return (
        <p className="font-pixel flex flex-wrap items-center justify-center gap-2 fs-15">
          <span className="text-muted-foreground">사과</span>
          <span className="text-game">▶</span>
          <span className="text-muted-foreground">과자</span>
          <span className="text-game">▶</span>
          <span className="text-game neon-text">
            자<span className="animate-blink">_</span>
          </span>
        </p>
      );
  }
}

/** 홈 화면의 게임 한 대. 간판, 화면, 조작부로 이뤄진 오락기 모양입니다. */
export function Cabinet({ game, index }: { game: Game; index: number }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      data-game={game.slug}
      className="group relative flex h-full flex-col outline-none transition-transform duration-150 hover:-translate-y-1.5 focus-visible:-translate-y-1.5"
    >
      {/* 간판 */}
      <div className="border-2 border-b-0 border-ink bg-ink px-3 pt-2 pb-3 group-hover:[--glow:var(--game)] group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <Bulbs count={12} />
        <h3 className="font-pixel mt-2 text-center fs-2 text-game neon-text group-hover:animate-flicker">
          {game.title}
        </h3>
      </div>
      {/* 몸체 */}
      <div className="flex flex-1 flex-col gap-4 border-2 border-ink bg-card p-4 shadow-[6px_6px_0_0_var(--ink)] transition-shadow group-hover:shadow-[6px_6px_0_0_var(--ink),0_0_36px_color-mix(in_oklch,var(--game)_45%,transparent)]">
        <div className="crt neon-box flex h-36 items-center justify-center border-2 border-ink [--glow:var(--game)]">
          <div className="relative z-10 px-3">
            <Attract slug={game.slug} />
          </div>
        </div>
        <p className="flex-1 text-sm/relaxed text-muted-foreground">{game.description}</p>
        {/* 조작부 */}
        <div className="flex items-center justify-between border-t-2 border-border pt-4">
          <div className="flex items-center gap-3">
            <Joystick className="size-7 text-muted-foreground transition-colors group-hover:text-game" />
            <span className="flex gap-1.5" aria-hidden>
              <span className="size-4 rounded-full border-2 border-ink bg-neon-red" />
              <span className="size-4 rounded-full border-2 border-ink bg-neon-yellow" />
              <span className="size-4 rounded-full border-2 border-ink bg-neon-cyan" />
            </span>
          </div>
          <span className="font-pixel flex items-center gap-1.5 fs-1 text-muted-foreground">
            <Users className="size-4" />
            {game.players}
          </span>
        </div>
        <span className="font-pixel flex h-11 items-center justify-center gap-2 border-2 border-ink bg-game fs-15 text-ink pixel-shadow transition-[transform,box-shadow] group-active:translate-y-1 group-active:shadow-none">
          <Play className="size-5" />
          PLAY
        </span>
      </div>
      <span className="font-pixel absolute -top-2 -left-2 border-2 border-ink bg-neon-yellow px-1.5 fs-1 text-ink">
        {String(index + 1).padStart(2, "0")}
      </span>
    </Link>
  );
}
