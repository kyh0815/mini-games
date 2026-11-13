import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateRoom } from "@/components/RoomEntry";
import { Card } from "@/components/ui";
import { games, getGame } from "@/lib/games";

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: PageProps<"/games/[slug]">): Promise<Metadata> {
  const game = getGame((await params).slug);
  return game ? { title: `${game.title} | 미니게임`, description: game.description } : {};
}

export default async function GamePage({ params }: PageProps<"/games/[slug]">) {
  const game = getGame((await params).slug);
  if (!game) notFound();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← 홈
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {game.emoji} {game.title}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {game.description} · {game.players}
        </p>
      </header>
      <Card>
        <h2 className="mb-3 font-medium">게임 방법</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          {game.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </Card>
      <Card>
        <h2 className="mb-3 font-medium">방 만들기</h2>
        <CreateRoom game={game.slug} />
      </Card>
    </main>
  );
}
