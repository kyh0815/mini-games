import Link from "next/link";
import { games } from "@/lib/games";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">미니게임</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          팀원들과 함께 즐기는 미니게임 모음
        </p>
      </header>

      {games.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-zinc-500 dark:border-zinc-700">
          아직 등록된 게임이 없습니다.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {games.map((game) => (
            <li key={game.slug}>
              <Link
                href={`/games/${game.slug}`}
                className="flex h-full flex-col gap-2 rounded-xl border border-zinc-200 p-5 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <span className="text-lg font-medium">{game.title}</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {game.description}
                </span>
                <span className="mt-auto text-xs text-zinc-500">
                  {game.players}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
