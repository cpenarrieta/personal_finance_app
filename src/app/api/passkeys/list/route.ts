import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { NextRequest, NextResponse } from "next/server"
import { logError } from "@/lib/utils/logger"

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const passkeys = await prisma.passkey.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        deviceType: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ passkeys })
  } catch (error) {
    logError("Failed to list passkeys:", error)
    return NextResponse.json({ error: "Failed to list passkeys" }, { status: 500 })
  }
}
