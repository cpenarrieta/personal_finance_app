import { validateAllowedEmail } from "@/lib/auth/auth-helpers"
import PasskeyManagement from "@/components/settings/PasskeyManagement"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Security Settings",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function SecurityPage() {
  await validateAllowedEmail()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Security Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your passkeys and biometric authentication.</p>
      </div>
      <PasskeyManagement />
    </div>
  )
}
