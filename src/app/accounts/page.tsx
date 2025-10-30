import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PlaidAccountWithRelations } from "@/types/prisma";

export const metadata: Metadata = {
  title: "Accounts",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountsPage() {
  const accounts = (await prisma.plaidAccount.findMany({
    include: {
      item: {
        include: {
          institution: true,
        },
      },
    },
  })) as PlaidAccountWithRelations[];

  // Group accounts by institution
  const accountsByInstitution = accounts.reduce((acc, account) => {
    const institutionName =
      account.item?.institution?.name || "Unknown Institution";
    if (!acc[institutionName]) {
      acc[institutionName] = {
        accounts: [],
        logoUrl: account.item?.institution?.logoUrl || null,
      };
    }
    acc[institutionName].accounts.push(account);
    return acc;
  }, {} as Record<string, { accounts: typeof accounts; logoUrl: string | null }>);

  const institutionNames = Object.keys(accountsByInstitution).sort();

  return (
    <div className="p-6 min-h-screen bg-background">
      <div className="mb-4">
        <Link href="/" className="text-primary hover:underline">
          ← Back to Home
        </Link>
      </div>
      <h2 className="text-xl font-semibold mb-4">Accounts</h2>
      {accounts.length === 0 ? (
        <p className="text-muted-foreground">
          No accounts found. Connect your bank and run sync.
        </p>
      ) : (
        <div className="space-y-6">
          {institutionNames.map((institutionName) => {
            const institution = accountsByInstitution[institutionName];
            if (!institution) return null;

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
                  <h3 className="text-lg font-semibold text-foreground">
                    {institutionName}
                  </h3>
                </div>
                <ul className="space-y-2 pl-2">
                  {institution.accounts.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/accounts/${a.id}`}
                        className="block border p-3 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="font-medium">
                          {a.name} {a.mask ? `• ${a.mask}` : ""}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {a.type}
                          {a.subtype ? ` / ${a.subtype}` : ""} · {a.currency}
                        </div>
                        {(a.currentBalance || a.availableBalance) && (
                          <div className="text-sm text-foreground mt-1">
                            {a.currentBalance && (
                              <span>
                                Balance: ${Number(a.currentBalance).toFixed(2)}
                              </span>
                            )}
                            {a.availableBalance && a.currentBalance && " · "}
                            {a.availableBalance && (
                              <span>
                                Available: $
                                {Number(a.availableBalance).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
