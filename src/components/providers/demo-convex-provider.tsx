"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ReactNode } from "react"

const demoConvex = new ConvexReactClient(process.env.NEXT_PUBLIC_DEMO_CONVEX_URL!)

export function DemoConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={demoConvex}>{children}</ConvexProvider>
}
