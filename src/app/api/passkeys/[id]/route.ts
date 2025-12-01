import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { NextRequest, NextResponse } from "next/server"
import { logError } from "@/lib/utils/logger"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the passkey belongs to the user
    const passkey = await prisma.passkey.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!passkey || passkey.userId !== session.user.id) {
      return NextResponse.json({ error: "Passkey not found" }, { status: 404 })
    }

    // Delete the passkey
    await prisma.passkey.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logError("Failed to delete passkey:", error)
    return NextResponse.json({ error: "Failed to delete passkey" }, { status: 500 })
  }
}
