import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { passkey } from "better-auth/plugins/passkey"
import { prisma } from "../db/prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: false, // Disable username/password login
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || "secret",
  trustedOrigins: [process.env.BETTER_AUTH_URL as string],
  plugins: [
    passkey({
      rpName: "Personal Finance App",
      rpID:
        process.env.NODE_ENV === "production" && process.env.BETTER_AUTH_URL
          ? new URL(process.env.BETTER_AUTH_URL).hostname
          : "localhost",
      origin:
        process.env.NODE_ENV === "production" && process.env.BETTER_AUTH_URL
          ? process.env.BETTER_AUTH_URL
          : "http://localhost:3000",
    }),
  ],
})
