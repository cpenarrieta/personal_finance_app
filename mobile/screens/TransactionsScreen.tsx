/**
 * Transactions list screen
 */
import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  type ListRenderItem,
} from 'react-native'
import { fetchTransactions, signOut } from '../lib/auth'

interface Transaction {
  id: string
  name: string
  merchantName: string | null
  amount_number: number
  date_string: string
  pending: boolean
  isoCurrencyCode: string | null
  category: {
    name: string
    imageUrl: string | null
  } | null
  account: {
    name: string
    mask: string | null
  }
  tags: Array<{
    tag: {
      name: string
      color: string | null
    }
  }>
}

interface TransactionsScreenProps {
  onLogout: () => void
}

export default function TransactionsScreen({ onLogout }: TransactionsScreenProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTransactions = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)

    const result = await fetchTransactions(100)

    if (result.success) {
      setTransactions(result.data || [])
    } else {
      setError(result.error || 'Failed to load transactions')
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  const handleLogout = async () => {
    await signOut()
    onLogout()
  }

  const formatAmount = (amount: number, currency?: string | null) => {
    const symbol = currency === 'USD' ? '$' : currency || ''
    const formatted = Math.abs(amount).toFixed(2)
    return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isExpense = item.amount_number > 0
    const displayName = item.merchantName || item.name

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          {item.category?.imageUrl && (
            <View style={styles.categoryIcon}>
              <Text style={styles.categoryEmoji}>{item.category.imageUrl}</Text>
            </View>
          )}
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionName} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.transactionMeta}>{item.account.name}</Text>
              {item.category && (
                <>
                  <Text style={styles.metaSeparator}>•</Text>
                  <Text style={styles.transactionMeta}>{item.category.name}</Text>
                </>
              )}
            </View>
            {item.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.tags.map((tagWrapper, index) => (
                  <View
                    key={index}
                    style={[
                      styles.tag,
                      tagWrapper.tag.color && {
                        backgroundColor: tagWrapper.tag.color + '20',
                        borderColor: tagWrapper.tag.color,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        tagWrapper.tag.color && { color: tagWrapper.tag.color },
                      ]}
                    >
                      {tagWrapper.tag.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.transactionRight}>
          <Text style={[styles.amount, isExpense ? styles.amountExpense : styles.amountIncome]}>
            {formatAmount(item.amount_number, item.isoCurrencyCode)}
          </Text>
          <Text style={styles.date}>{formatDate(item.date_string)}</Text>
          {item.pending && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadTransactions()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Transactions</Text>
          <Text style={styles.headerSubtitle}>{transactions.length} recent transactions</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
          <Text style={styles.headerButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item: Transaction) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTransactions(true)}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  logoutButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  list: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionMeta: {
    fontSize: 13,
    color: '#666',
  },
  metaSeparator: {
    fontSize: 13,
    color: '#ccc',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  amount: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  amountExpense: {
    color: '#dc3545',
  },
  amountIncome: {
    color: '#28a745',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  pendingBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#fff3cd',
  },
  pendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#856404',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
})
