import { GenericSyncButton } from './GenericSyncButton'

export function SyncPricesButton({ action }: { action: () => Promise<void> }) {
  return (
    <GenericSyncButton
      action={action}
      idleText="Sync Stock Prices"
      pendingText="Syncing Prices..."
      variant="default"
      className="bg-primary text-primary-foreground hover:bg-primary/90"
    />
  )
}
