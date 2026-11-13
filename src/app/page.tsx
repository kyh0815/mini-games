import { LobbyTabs, OnlineUsers } from "@/components/lobby";

export default function Home() {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <LobbyTabs />
      <aside className="lg:sticky lg:top-20">
        <OnlineUsers />
      </aside>
    </main>
  );
}
