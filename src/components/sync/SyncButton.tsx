import { GenericSyncButton } from "./GenericSyncButton"

export function SyncButton({ action }: { action: () => Promise<void> }) {
  return <GenericSyncButton action={action} idleText="Run Sync" pendingText="Syncing..." />
}
