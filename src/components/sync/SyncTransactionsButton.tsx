import { GenericSyncButton } from './GenericSyncButton'

export function SyncTransactionsButton({ action }: { action: () => Promise<void> }) {
  return (
    <GenericSyncButton
      action={action}
      idleText="Sync Transactions Only"
      pendingText="Syncing Transactions..."
    />
  )
}
