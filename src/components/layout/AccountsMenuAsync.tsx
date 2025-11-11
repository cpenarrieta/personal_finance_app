import { getAllAccountsWithInstitution } from "@/lib/db/queries"
import { AccountsMenuClient } from "./AccountsMenuClient"

export async function AccountsMenuAsync() {
  const accounts = await getAllAccountsWithInstitution()

  return <AccountsMenuClient accounts={accounts} />
}
