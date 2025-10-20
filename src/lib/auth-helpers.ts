import { auth } from "./auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();

  if (!session || !session.user) {
    redirect("/login");
  }

  return session;
}

export async function validateAllowedEmail() {
  const session = await requireAuth();

  const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase().trim();
  const userEmail = session.user.email?.toLowerCase().trim();

  if (!allowedEmail) {
    throw new Error("ALLOWED_EMAIL not configured");
  }

  if (userEmail !== allowedEmail) {
    // User is not authorized - sign them out and redirect
    redirect("/login?error=unauthorized");
  }

  return session;
}
