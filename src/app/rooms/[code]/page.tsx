import type { Metadata } from "next";
import { Suspense } from "react";
import { Blink } from "@/components/arcade/panel";
import { RoomClient } from "@/components/RoomClient";

export const metadata: Metadata = { title: "게임 방", robots: { index: false } };

async function Room({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomClient code={code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)} />;
}

export default function RoomPage({ params }: PageProps<"/rooms/[code]">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      {/* 방 코드는 요청 시점에만 알 수 있어, 나머지 화면 틀과 분리해 스트리밍합니다. */}
      <Suspense
        fallback={
          <p className="py-32 text-center">
            <Blink className="fs-2 text-neon-cyan">NOW LOADING…</Blink>
          </p>
        }
      >
        <Room params={params} />
      </Suspense>
    </main>
  );
}
