import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for accounts list
 */
export function AccountsListSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-2">
          {/* Institution header */}
          <div className="flex items-center gap-3 border-b pb-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>

          {/* Accounts list */}
          <ul className="space-y-2 pl-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <li key={j}>
                <div className="block border p-3 rounded">
                  <Skeleton className="h-5 w-64 mb-2" />
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
