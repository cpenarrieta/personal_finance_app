/**
 * Simple in-memory cache for storing pending reconnection data
 * Used to temporarily store exchange results while waiting for user confirmation
 */

interface ReconnectionData {
  accessToken: string
  itemId: string
  institutionId: string
  institutionName: string
  accounts: any[]
  existingItemId: string
  existingItemDbId: string
  transactionCount: number
  createdAt: number
}

const cache = new Map<string, ReconnectionData>()
const TTL = 5 * 60 * 1000 // 5 minutes

export function storeReconnectionData(data: Omit<ReconnectionData, "createdAt">): string {
  const id = crypto.randomUUID()
  cache.set(id, { ...data, createdAt: Date.now() })

  // Clean up expired entries
  cleanExpired()

  return id
}

export function getReconnectionData(id: string): ReconnectionData | null {
  cleanExpired()
  return cache.get(id) || null
}

export function clearReconnectionData(id: string): void {
  cache.delete(id)
}

function cleanExpired(): void {
  const now = Date.now()
  for (const [id, data] of cache.entries()) {
    if (now - data.createdAt > TTL) {
      cache.delete(id)
    }
  }
}
