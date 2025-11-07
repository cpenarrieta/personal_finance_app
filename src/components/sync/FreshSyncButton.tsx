import { GenericSyncButton } from './GenericSyncButton'

export function FreshSyncButton({ action }: { action: () => Promise<void> }) {
  return (
    <GenericSyncButton
      action={action}
      idleText="Sync from Scratch"
      pendingText="Syncing from scratch..."
      className="border-orange-500 text-orange-600 hover:bg-orange-50"
      requireConfirmation
      confirmationTitle="Confirm Sync from Scratch"
      confirmationDescription="This will re-sync all your data from scratch. This operation may take a few minutes. Are you sure you want to continue?"
    />
  )
}
