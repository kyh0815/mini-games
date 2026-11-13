import { BrandHero, LobbyTabs, OnlineUsers } from "@/components/lobby";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-7 px-4 py-6 sm:px-6">
      <BrandHero />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <LobbyTabs />
        <aside className="lg:sticky lg:top-20">
          <OnlineUsers />
        </aside>
      </div>
    </main>
  );
}
