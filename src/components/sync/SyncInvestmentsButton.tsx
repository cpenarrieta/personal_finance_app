import { GenericSyncButton } from "./GenericSyncButton"

export function SyncInvestmentsButton({ action }: { action: () => Promise<void> }) {
  return <GenericSyncButton action={action} idleText="Sync Investments Only" pendingText="Syncing Investments..." />
}
