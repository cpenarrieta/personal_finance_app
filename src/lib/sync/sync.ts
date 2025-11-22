// lib/sync.ts
// Convenience wrappers for different sync operations
import { syncItems } from "./sync-service"

export async function syncAllItems() {
  await syncItems({ syncTransactions: true, syncInvestments: true, syncLiabilities: true })
}

export async function syncTransactionsOnly() {
  await syncItems({ syncTransactions: true, syncInvestments: false, syncLiabilities: false })
}

export async function syncInvestmentsOnly() {
  await syncItems({ syncTransactions: false, syncInvestments: true, syncLiabilities: false })
}

export async function syncLiabilitiesOnly() {
  await syncItems({ syncTransactions: false, syncInvestments: false, syncLiabilities: true })
}
