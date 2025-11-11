import { GenericSyncButton } from "./GenericSyncButton"

export function SyncHoldingsLogosButton({ action }: { action: () => Promise<void> }) {
  return (
    <GenericSyncButton
      action={action}
      idleText="Sync Holdings Logos"
      pendingText="Syncing Logos..."
      variant="secondary"
      className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
    />
  )
}
