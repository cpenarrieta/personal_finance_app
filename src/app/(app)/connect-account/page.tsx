import type { Metadata } from "next"
import { ConnectAccountConvex } from "@/components/connect-account/ConnectAccountConvex"

export const metadata: Metadata = {
  title: "Connect Account",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ConnectAccountPage() {
  return <ConnectAccountConvex />
}
