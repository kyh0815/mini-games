import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { Header } from "@/components/arcade/header";
import { NicknameDialog } from "@/components/arcade/nickname";
import { SoundBoot } from "@/components/arcade/sound";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// 제목·숫자용 한글 픽셀 폰트 (Galmuri11, SIL OFL 1.1)
const galmuri = localFont({
  src: "../../node_modules/galmuri/dist/Galmuri11.woff2",
  variable: "--font-galmuri",
  display: "swap",
});

const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: { default: "MINI GAME HEAVEN | 미니게임 천국", template: "%s | MINI GAME HEAVEN" },
  description: "팀원들과 함께 즐기는 미니게임 천국. 방을 만들어 함께하거나, 혼자 기록에 도전하세요.",
};

export const viewport: Viewport = { themeColor: "#1b1c22", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`dark h-full antialiased ${galmuri.variable} ${jetbrains.variable}`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider delayDuration={200}>
          <Header />
          <div className="flex flex-1 flex-col">{children}</div>
          <NicknameDialog />
        </TooltipProvider>
        <Toaster />
        <SoundBoot />
      </body>
    </html>
  );
}
