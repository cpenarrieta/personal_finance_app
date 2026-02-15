import type { Metadata } from "next"
import { DemoChatPage } from "@/components/demo/DemoChatPage"

export const metadata: Metadata = {
  title: "Demo - AI Chat",
  robots: { index: true, follow: false },
}

export default function DemoChatPageRoute() {
  return <DemoChatPage />
}
