import Link from "next/link"
import Image from "next/image"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import { getAllAccountsWithInstitution } from "@/lib/demo/queries"

export async function DemoAccountsListAsync() {
  try {
    const accounts = await getAllAccountsWithInstitution()

    type AccountWithInstitution = (typeof accounts)[number]

    const accountsByInstitution = (accounts as any[]).reduce(
      (
        acc: Record<string, { accounts: AccountWithInstitution[]; logoUrl: string | null }>,
        account: AccountWithInstitution,
      ) => {
        const institutionName = (account as any).item?.institution?.name || "Unknown Institution"
        if (!acc[institutionName]) {
          acc[institutionName] = {
            accounts: [],
            logoUrl: (account as any).item?.institution?.logoUrl || null,
          }
        }
        acc[institutionName].accounts.push(account)
        return acc
      },
      {} as Record<string, { accounts: AccountWithInstitution[]; logoUrl: string | null }>,
    )

    const institutionNames = Object.keys(accountsByInstitution).sort()

    if ((accounts as any[]).length === 0) {
      return <p className="text-muted-foreground">No accounts found in demo data.</p>
    }

    return (
      <div className="space-y-6">
        {institutionNames.map((institutionName) => {
          const institution = accountsByInstitution[institutionName]
          if (!institution) return null

          return (
            <div key={institutionName} className="space-y-2">
              <div className="flex items-center gap-3 border-b pb-2">
                {institution.logoUrl && (
                  <Image
                    src={institution.logoUrl}
                    alt={`${institutionName} logo`}
                    width={32}
                    height={32}
                    className="rounded object-contain"
                  />
                )}
                <h3 className="text-lg font-semibold text-foreground">{institutionName}</h3>
              </div>
              <ul className="space-y-2 pl-2">
                {institution.accounts.map((a: any) => (
                  <li key={a.id}>
                    <Link
                      href={`/demo/accounts/${a.id}`}
                      className="block border p-3 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="font-medium">
                        {a.name} {a.mask ? `• ${a.mask}` : ""}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {a.type}
                        {a.subtype ? ` / ${a.subtype}` : ""} · {a.currency}
                      </div>
                      {(a.current_balance_number != null || a.available_balance_number != null) && (
                        <div className="text-sm text-foreground mt-1">
                          {a.current_balance_number != null && (
                            <span>Balance: ${a.current_balance_number.toFixed(2)}</span>
                          )}
                          {a.available_balance_number != null && a.current_balance_number != null && " · "}
                          {a.available_balance_number != null && (
                            <span>Available: ${a.available_balance_number.toFixed(2)}</span>
                          )}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    )
  } catch (error) {
    logError("Failed to load demo accounts:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load accounts"
        description="Unable to fetch demo account data"
      />
    )
  }
}
