import Link from "next/link";
import { JoinByCode } from "@/components/RoomEntry";
import { games } from "@/lib/games";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">미니게임</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            팀원들과 함께 즐기는 미니게임 모음. 방을 만들고 링크를 공유하세요.
          </p>
        </div>
        <JoinByCode />
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {games.map((game) => (
          <li key={game.slug}>
            <Link
              href={`/games/${game.slug}`}
              className="flex h-full flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500"
            >
              <span className="text-3xl">{game.emoji}</span>
              <span className="text-lg font-medium">{game.title}</span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {game.description}
              </span>
              <span className="mt-auto pt-2 text-xs text-zinc-500">{game.players}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
