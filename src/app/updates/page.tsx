import type { Metadata } from "next";
import { UpdatesBoard } from "@/components/updates";

export const metadata: Metadata = { title: "업데이트 소식" };

export default function UpdatesPage() {
  return <UpdatesBoard />;
}
