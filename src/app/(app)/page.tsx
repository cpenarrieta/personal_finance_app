import type { Metadata } from "next"
import { DashboardConvex } from "@/components/dashboard/DashboardConvex"

export const metadata: Metadata = {
  title: "Dashboard | Personal Finance",
  robots: {
    index: false,
    follow: false,
  },
}

export default function Page() {
  return <DashboardConvex />
}
