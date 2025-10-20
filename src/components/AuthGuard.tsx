import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export async function AuthGuard({ children }: { children: React.ReactNode }) {
  // Get the current session
  const session = await getSession();

  // If there's a session, validate the email
  if (session?.user?.email) {
    const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase().trim();
    const userEmail = session.user.email?.toLowerCase().trim();

    if (!allowedEmail) {
      throw new Error("ALLOWED_EMAIL not configured");
    }

    if (userEmail !== allowedEmail) {
      // User is authenticated but not authorized - sign them out and redirect
      redirect("/login?error=unauthorized");
    }
  }

  // If no session, middleware will handle redirect to /login
  // If session is valid and email matches, render children
  return <>{children}</>;
}
