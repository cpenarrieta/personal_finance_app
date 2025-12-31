import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { NextRequest } from "next/server"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user?.id) {
      return apiErrors.unauthorized()
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

    return apiSuccess({ passkeys })
  } catch (error) {
    logError("Failed to list passkeys:", error)
    return apiErrors.internalError("Failed to list passkeys")
  }
}
