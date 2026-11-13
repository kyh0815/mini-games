import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Blink, Bulbs, Panel, Screen } from "@/components/arcade/panel";
import { Rules } from "@/components/games/shared";
import { ArrowLeft, Users } from "@/components/icons";
import { CreateRoom } from "@/components/RoomEntry";
import { Button } from "@/components/ui/button";
import { games, getGame } from "@/lib/games";

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: PageProps<"/games/[slug]">): Promise<Metadata> {
  const game = getGame((await params).slug);
  return game ? { title: game.title, description: game.description } : {};
}

export default function GamePage({ params }: PageProps<"/games/[slug]">) {
  return (
    <Suspense>
      <GameIntro params={params} />
    </Suspense>
  );
}

async function GameIntro({ params }: { params: Promise<{ slug: string }> }) {
  const game = getGame((await params).slug);
  if (!game) notFound();
  return (
    <main
      data-game={game.slug}
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6"
    >
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/">
          <ArrowLeft />
          게임 목록
        </Link>
      </Button>

      <header className="border-2 border-ink bg-ink px-5 py-4">
        <Bulbs count={20} />
        <div className="flex flex-col items-center gap-2 py-5 text-center">
          <h1 className="font-pixel animate-flicker fs-4 text-game neon-text sm:fs-6">
            {game.title}
          </h1>
          <p className="max-w-xl text-sm/relaxed text-muted-foreground">{game.description}</p>
          <span className="font-pixel mt-1 flex items-center gap-1.5 fs-1 text-neon-yellow">
            <Users className="size-4" />
            {game.players}
          </span>
        </div>
        <Bulbs count={20} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Screen>
          <div className="flex flex-col gap-5 p-5 sm:p-7">
            <h2 className="font-pixel fs-15 text-game">HOW TO PLAY</h2>
            <Rules rules={game.rules} />
          </div>
        </Screen>
        <Panel
          label="NEW GAME"
          action={<Blink className="fs-1 text-neon-yellow">INSERT COIN</Blink>}
          className="self-start"
        >
          <div className="flex flex-col gap-4 p-5">
            <p className="text-sm/relaxed text-muted-foreground">
              방을 만들면 초대 링크와 4자리 코드가 나옵니다. 팀원에게 공유하세요.
            </p>
            <CreateRoom game={game.slug} />
          </div>
        </Panel>
      </div>
    </main>
  );
}
