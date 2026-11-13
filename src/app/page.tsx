import { GameGrid, OnlineUsers, RoomList } from "@/components/lobby";

export default function Home() {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex flex-col gap-10">
        <RoomList />
        <GameGrid />
      </div>
      <aside className="lg:sticky lg:top-[5.5rem]">
        <OnlineUsers />
      </aside>
    </main>
  );
}
