import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { NextRequest } from "next/server"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    // Verify the passkey belongs to the user
    const passkey = await prisma.passkey.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!passkey || passkey.userId !== session.user.id) {
      return apiErrors.notFound("Passkey")
    }

    // Delete the passkey
    await prisma.passkey.delete({
      where: { id },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    logError("Failed to delete passkey:", error)
    return apiErrors.internalError("Failed to delete passkey")
  }
}
