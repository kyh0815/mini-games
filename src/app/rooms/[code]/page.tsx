import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomClient } from "@/components/RoomClient";

export const metadata: Metadata = { title: "게임 방 | 미니게임", robots: { index: false } };

async function Room({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomClient code={code.toUpperCase().slice(0, 8)} />;
}

export default function RoomPage({ params }: PageProps<"/rooms/[code]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      {/* 방 코드는 요청 시점에만 알 수 있어, 나머지 화면 틀과 분리해 스트리밍합니다. */}
      <Suspense fallback={<p className="py-20 text-center text-zinc-500">접속 중…</p>}>
        <Room params={params} />
      </Suspense>
    </main>
  );
}
