import type { Metadata } from "next";
import { RoomClient } from "@/components/RoomClient";

export const metadata: Metadata = { title: "게임 방", robots: { index: false } };

// 방 코드는 요청 시점에만 알 수 있습니다. 로딩 화면을 거치면 React가 전환을 0.3초 붙잡아 두므로,
// 로딩 화면 없이 바로 그리도록 합니다. (서버에서 하는 일이 없어 기다릴 것이 없습니다)
export const instant = false;

export default async function RoomPage({ params }: PageProps<"/rooms/[code]">) {
  const { code } = await params;
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <RoomClient code={code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)} />
    </main>
  );
}
