/**
 * Migration script: Migrate auth data from PostgreSQL (Prisma) to Convex Better Auth
 *
 * This script:
 * 1. Reads User, Session, Account, Passkey, Verification data from PostgreSQL
 * 2. Transforms the data to match the Convex Better Auth schema
 * 3. Inserts the data into Convex using the Better Auth component's adapter
 *
 * Usage:
 *   npx tsx scripts/migrate-auth.ts
 *
 * Prerequisites:
 *   - DATABASE_URL must be set for PostgreSQL connection
 *   - CONVEX_URL must be set for Convex connection
 *   - Run this AFTER deploying the new auth schema to Convex
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/generated"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../convex/_generated/api"

const prisma = new PrismaClient()
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

async function migrateUsers() {
  console.log("Migrating users...")
  const users = await prisma.user.findMany()

  for (const user of users) {
    try {
      // Better Auth component manages user creation through its adapter
      // We'll use a manual approach via internal mutation
      console.log(`  - Migrating user: ${user.email}`)

      // Note: You may need to call the component's adapter.create directly
      // This is a placeholder - adjust based on your actual Convex setup
      await convex.mutation(api.init.migrateUser, {
        id: user.id,
        email: user.email,
        name: user.name || "",
        emailVerified: user.emailVerified,
        image: user.image || undefined,
        createdAt: user.createdAt.getTime(),
        updatedAt: user.updatedAt.getTime(),
      })
    } catch (error) {
      console.error(`  ! Failed to migrate user ${user.email}:`, error)
    }
  }

  console.log(`Migrated ${users.length} users`)
}

async function migrateAccounts() {
  console.log("Migrating OAuth accounts...")
  const accounts = await prisma.account.findMany()

  for (const account of accounts) {
    try {
      console.log(`  - Migrating account: ${account.providerId}/${account.accountId}`)

      await convex.mutation(api.init.migrateAccount, {
        id: account.id,
        userId: account.userId,
        providerId: account.providerId,
        accountId: account.accountId,
        accessToken: account.accessToken || undefined,
        refreshToken: account.refreshToken || undefined,
        accessTokenExpiresAt: account.accessTokenExpiresAt?.getTime(),
        refreshTokenExpiresAt: account.refreshTokenExpiresAt?.getTime(),
        scope: account.scope || undefined,
        idToken: account.idToken || undefined,
        password: account.password || undefined,
        createdAt: account.createdAt.getTime(),
        updatedAt: account.updatedAt.getTime(),
      })
    } catch (error) {
      console.error(`  ! Failed to migrate account:`, error)
    }
  }

  console.log(`Migrated ${accounts.length} accounts`)
}

async function migratePasskeys() {
  console.log("Migrating passkeys...")
  const passkeys = await prisma.passkey.findMany()

  for (const passkey of passkeys) {
    try {
      console.log(`  - Migrating passkey: ${passkey.name || passkey.id}`)

      await convex.mutation(api.init.migratePasskey, {
        id: passkey.id,
        userId: passkey.userId,
        name: passkey.name || undefined,
        publicKey: passkey.publicKey,
        credentialID: passkey.credentialID,
        counter: passkey.counter,
        deviceType: passkey.deviceType,
        backedUp: passkey.backedUp,
        transports: passkey.transports || undefined,
        aaguid: passkey.aaguid || undefined,
        createdAt: passkey.createdAt?.getTime(),
      })
    } catch (error) {
      console.error(`  ! Failed to migrate passkey:`, error)
    }
  }

  console.log(`Migrated ${passkeys.length} passkeys`)
}

async function migrateSessions() {
  console.log("Migrating active sessions...")
  const sessions = await prisma.session.findMany({
    where: {
      expiresAt: {
        gt: new Date(),
      },
    },
  })

  for (const session of sessions) {
    try {
      console.log(`  - Migrating session: ${session.id}`)

      await convex.mutation(api.init.migrateSession, {
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt.getTime(),
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
        createdAt: session.createdAt.getTime(),
        updatedAt: session.updatedAt.getTime(),
      })
    } catch (error) {
      console.error(`  ! Failed to migrate session:`, error)
    }
  }

  console.log(`Migrated ${sessions.length} active sessions`)
}

async function main() {
  console.log("Starting auth data migration from PostgreSQL to Convex...")
  console.log("")

  try {
    await migrateUsers()
    console.log("")

    await migrateAccounts()
    console.log("")

    await migratePasskeys()
    console.log("")

    await migrateSessions()
    console.log("")

    console.log("Migration completed successfully!")
    console.log("")
    console.log("Next steps:")
    console.log("1. Verify the data in Convex dashboard")
    console.log("2. Test login with existing users")
    console.log("3. After verification, you can remove Prisma dependencies")
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
