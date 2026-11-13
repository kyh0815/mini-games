import { Cabinet } from "@/components/arcade/cabinet";
import { Blink, Bulbs, Panel } from "@/components/arcade/panel";
import { JoinByCode } from "@/components/RoomEntry";
import { games } from "@/lib/games";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-10 sm:px-6 sm:py-14">
      <section className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-5">
          <Blink className="fs-15 text-neon-yellow">▶ INSERT COIN</Blink>
          <h1 className="font-pixel fs-4 leading-tight sm:fs-6">
            <span className="animate-flicker text-neon-pink neon-text">미니게임</span>{" "}
            <span className="text-neon-cyan neon-text">오락실</span>
          </h1>
          <p className="max-w-xl text-base/relaxed text-muted-foreground">
            팀원들과 함께 즐기는 실시간 미니게임. 게임을 골라 방을 만들고 초대 링크를 공유하면, 각자
            자기 자리에서 바로 참여할 수 있습니다.
          </p>
        </div>
        <Panel label="JOIN GAME" className="[--game:var(--neon-yellow)]">
          <div className="flex flex-col gap-3 p-5">
            <p className="text-sm text-muted-foreground">초대받은 방 코드가 있나요?</p>
            <JoinByCode />
          </div>
        </Panel>
      </section>

      <section className="flex flex-col gap-7">
        <div className="flex items-center gap-4">
          <h2 className="font-pixel shrink-0 fs-2 text-foreground">SELECT GAME</h2>
          <Bulbs count={24} className="flex-1" />
        </div>
        <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {games.map((game, i) => (
            <li key={game.slug}>
              <Cabinet game={game} index={i} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
