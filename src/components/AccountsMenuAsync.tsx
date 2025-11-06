import { getAllAccountsWithInstitution } from "@/lib/cached-queries";
import { AccountsMenuClient } from "./AccountsMenuClient";

export async function AccountsMenuAsync() {
  const accounts = await getAllAccountsWithInstitution();

  return <AccountsMenuClient accounts={accounts} />;
}
