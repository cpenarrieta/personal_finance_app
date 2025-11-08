/**
 * Unit tests for Dashboard Calculations
 *
 * Tests cover:
 * 1. Total balance calculation
 * 2. Investment value calculation
 * 3. Spending by category aggregation
 * 4. Spending by subcategory aggregation
 * 5. Daily spending data preparation
 */

import {
  calculateTotalBalance,
  calculateInvestmentValue,
  prepareSpendingByCategory,
  prepareSpendingBySubcategory,
  prepareDailySpendingData,
} from '../calculations'

describe('Dashboard Calculations', () => {
  describe('calculateTotalBalance', () => {
    it('should calculate total balance across all accounts', () => {
      // Arrange
      const accounts = [
        { current_balance_number: 1000 },
        { current_balance_number: 2500 },
        { current_balance_number: 750 },
      ]

      // Act
      const total = calculateTotalBalance(accounts)

      // Assert
      expect(total).toBe(4250)
    })

    it('should handle null balances as zero', () => {
      // Arrange
      const accounts = [
        { current_balance_number: 1000 },
        { current_balance_number: null },
        { current_balance_number: 500 },
      ]

      // Act
      const total = calculateTotalBalance(accounts)

      // Assert
      expect(total).toBe(1500)
    })

    it('should return 0 for empty accounts array', () => {
      // Arrange
      const accounts: { current_balance_number: number | null }[] = []

      // Act
      const total = calculateTotalBalance(accounts)

      // Assert
      expect(total).toBe(0)
    })

    it('should handle negative balances', () => {
      // Arrange
      const accounts = [
        { current_balance_number: 1000 },
        { current_balance_number: -500 },
        { current_balance_number: 250 },
      ]

      // Act
      const total = calculateTotalBalance(accounts)

      // Assert
      expect(total).toBe(750)
    })

    it('should handle all null balances', () => {
      // Arrange
      const accounts = [
        { current_balance_number: null },
        { current_balance_number: null },
      ]

      // Act
      const total = calculateTotalBalance(accounts)

      // Assert
      expect(total).toBe(0)
    })
  })

  describe('calculateInvestmentValue', () => {
    it('should calculate total investment value', () => {
      // Arrange
      const holdings = [
        { quantity_number: 10, institution_price_number: 150 },
        { quantity_number: 5, institution_price_number: 200 },
        { quantity_number: 20, institution_price_number: 50 },
      ]

      // Act
      const total = calculateInvestmentValue(holdings)

      // Assert
      expect(total).toBe(3500) // (10*150) + (5*200) + (20*50)
    })

    it('should handle null quantities as zero', () => {
      // Arrange
      const holdings = [
        { quantity_number: 10, institution_price_number: 150 },
        { quantity_number: null, institution_price_number: 200 },
      ]

      // Act
      const total = calculateInvestmentValue(holdings)

      // Assert
      expect(total).toBe(1500)
    })

    it('should handle null prices as zero', () => {
      // Arrange
      const holdings = [
        { quantity_number: 10, institution_price_number: 150 },
        { quantity_number: 5, institution_price_number: null },
      ]

      // Act
      const total = calculateInvestmentValue(holdings)

      // Assert
      expect(total).toBe(1500)
    })

    it('should return 0 for empty holdings array', () => {
      // Arrange
      const holdings: { quantity_number: number | null; institution_price_number: number | null }[] = []

      // Act
      const total = calculateInvestmentValue(holdings)

      // Assert
      expect(total).toBe(0)
    })

    it('should handle fractional quantities and prices', () => {
      // Arrange
      const holdings = [
        { quantity_number: 10.5, institution_price_number: 99.99 },
        { quantity_number: 2.25, institution_price_number: 45.50 },
      ]

      // Act
      const total = calculateInvestmentValue(holdings)

      // Assert
      expect(total).toBeCloseTo(1152.265, 2)
    })
  })

  describe('prepareSpendingByCategory', () => {
    const mockTransactions = [
      {
        amount_number: 50,
        date_string: '2024-01-01',
        category: {
          id: 'cat-1',
          name: 'Food',
          imageUrl: null,
          isTransferCategory: false,
          created_at_string: null,
          updated_at_string: null,
        },
        subcategory: null,
      },
      {
        amount_number: 100,
        date_string: '2024-01-02',
        category: {
          id: 'cat-1',
          name: 'Food',
          imageUrl: null,
          isTransferCategory: false,
          created_at_string: null,
          updated_at_string: null,
        },
        subcategory: null,
      },
      {
        amount_number: 75,
        date_string: '2024-01-03',
        category: {
          id: 'cat-2',
          name: 'Transportation',
          imageUrl: null,
          isTransferCategory: false,
          created_at_string: null,
          updated_at_string: null,
        },
        subcategory: null,
      },
    ]

    it('should aggregate spending by category', () => {
      // Act
      const result = prepareSpendingByCategory(mockTransactions)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ name: 'Food', value: 150 })
      expect(result[1]).toMatchObject({ name: 'Transportation', value: 75 })
    })

    it('should sort categories by spending amount descending', () => {
      // Act
      const result = prepareSpendingByCategory(mockTransactions)

      // Assert
      expect(result[0].value).toBeGreaterThan(result[1].value)
      expect(result[0].name).toBe('Food')
      expect(result[1].name).toBe('Transportation')
    })

    it('should limit results to topN', () => {
      // Arrange
      const manyTransactions = Array.from({ length: 15 }, (_, i) => ({
        amount_number: 10,
        date_string: '2024-01-01',
        category: {
          id: `cat-${i}`,
          name: `Category ${i}`,
          imageUrl: null,
          isTransferCategory: false,
          created_at_string: null,
          updated_at_string: null,
        },
        subcategory: null,
      }))

      // Act
      const result = prepareSpendingByCategory(manyTransactions, 5)

      // Assert
      expect(result).toHaveLength(5)
    })

    it('should exclude transfer categories', () => {
      // Arrange
      const transactionsWithTransfer = [
        ...mockTransactions,
        {
          amount_number: 200,
          date_string: '2024-01-04',
          category: {
            id: 'cat-transfer',
            name: 'Transfer',
            imageUrl: null,
            isTransferCategory: true,
            created_at_string: null,
            updated_at_string: null,
          },
          subcategory: null,
        },
      ]

      // Act
      const result = prepareSpendingByCategory(transactionsWithTransfer)

      // Assert
      expect(result).toHaveLength(2)
      expect(result.find((r) => r.name === 'Transfer')).toBeUndefined()
    })

    it('should exclude income transactions (negative amounts)', () => {
      // Arrange
      const transactionsWithIncome = [
        ...mockTransactions,
        {
          amount_number: -500,
          date_string: '2024-01-04',
          category: {
            id: 'cat-income',
            name: 'Salary',
            imageUrl: null,
            isTransferCategory: false,
            created_at_string: null,
            updated_at_string: null,
          },
          subcategory: null,
        },
      ]

      // Act
      const result = prepareSpendingByCategory(transactionsWithIncome)

      // Assert
      expect(result).toHaveLength(2)
      expect(result.find((r) => r.name === 'Salary')).toBeUndefined()
    })

    it('should handle transactions without categories', () => {
      // Arrange
      const transactionsWithoutCategory = [
        {
          amount_number: 50,
          date_string: '2024-01-01',
          category: null,
          subcategory: null,
        },
      ]

      // Act
      const result = prepareSpendingByCategory(transactionsWithoutCategory)

      // Assert
      expect(result).toHaveLength(0)
    })

    it('should assign colors to categories', () => {
      // Act
      const result = prepareSpendingByCategory(mockTransactions)

      // Assert
      expect(result[0]).toHaveProperty('color')
      expect(result[0].color).toMatch(/var\(--chart-\d\)/)
    })
  })

  describe('prepareSpendingBySubcategory', () => {
    const mockTransactions = [
      {
        amount_number: 50,
        date_string: '2024-01-01',
        category: {
          id: 'cat-1',
          name: 'Food',
          imageUrl: null,
          isTransferCategory: false,
          created_at_string: null,
          updated_at_string: null,
        },
        subcategory: {
          id: 'subcat-1',
          categoryId: 'cat-1',
          name: 'Restaurants',
          imageUrl: null,
          created_at_string: null,
          updated_at_string: null,
        },
      },
      {
        amount_number: 100,
        date_string: '2024-01-02',
        category: {
          id: 'cat-1',
          name: 'Food',
          imageUrl: null,
          isTransferCategory: false,
          created_at_string: null,
          updated_at_string: null,
        },
        subcategory: {
          id: 'subcat-2',
          categoryId: 'cat-1',
          name: 'Groceries',
          imageUrl: null,
          created_at_string: null,
          updated_at_string: null,
        },
      },
    ]

    it('should aggregate spending by subcategory', () => {
      // Act
      const result = prepareSpendingBySubcategory(mockTransactions)

      // Assert
      expect(result).toHaveLength(2)
      expect(result.find((r) => r.name === 'Restaurants')).toMatchObject({ value: 50 })
      expect(result.find((r) => r.name === 'Groceries')).toMatchObject({ value: 100 })
    })

    it('should exclude transactions without subcategories', () => {
      // Arrange
      const transactionsWithoutSubcategory = [
        ...mockTransactions,
        {
          amount_number: 75,
          date_string: '2024-01-03',
          category: {
            id: 'cat-1',
            name: 'Food',
            imageUrl: null,
            isTransferCategory: false,
            created_at_string: null,
            updated_at_string: null,
          },
          subcategory: null,
        },
      ]

      // Act
      const result = prepareSpendingBySubcategory(transactionsWithoutSubcategory)

      // Assert
      expect(result).toHaveLength(2)
      expect(result.find((r) => r.name === 'Other')).toBeUndefined()
    })

    it('should exclude transfer categories', () => {
      // Arrange
      const transactionsWithTransfer = [
        ...mockTransactions,
        {
          amount_number: 200,
          date_string: '2024-01-04',
          category: {
            id: 'cat-transfer',
            name: 'Transfer',
            imageUrl: null,
            isTransferCategory: true,
            created_at_string: null,
            updated_at_string: null,
          },
          subcategory: {
            id: 'subcat-3',
            categoryId: 'cat-transfer',
            name: 'Internal Transfer',
            imageUrl: null,
            created_at_string: null,
            updated_at_string: null,
          },
        },
      ]

      // Act
      const result = prepareSpendingBySubcategory(transactionsWithTransfer)

      // Assert
      expect(result).toHaveLength(2)
      expect(result.find((r) => r.name === 'Internal Transfer')).toBeUndefined()
    })
  })

  describe('prepareDailySpendingData', () => {
    it('should prepare daily spending data for date range', () => {
      // Arrange
      const transactions = [
        {
          amount_number: 50,
          date_string: '2024-01-15',
          category: {
            id: 'cat-1',
            name: 'Food',
            imageUrl: null,
            isTransferCategory: false,
            created_at_string: null,
            updated_at_string: null,
          },
          subcategory: null,
        },
        {
          amount_number: 100,
          date_string: '2024-01-15',
          category: {
            id: 'cat-2',
            name: 'Transportation',
            imageUrl: null,
            isTransferCategory: false,
            created_at_string: null,
            updated_at_string: null,
          },
          subcategory: null,
        },
        {
          amount_number: 75,
          date_string: '2024-01-16',
          category: {
            id: 'cat-1',
            name: 'Food',
            imageUrl: null,
            isTransferCategory: false,
            created_at_string: null,
            updated_at_string: null,
          },
          subcategory: null,
        },
      ]
      const startDate = new Date('2024-01-15')
      const endDate = new Date('2024-01-16')

      // Act
      const result = prepareDailySpendingData(transactions, startDate, endDate)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ day: 'Jan 15', spending: 150 })
      expect(result[1]).toMatchObject({ day: 'Jan 16', spending: 75 })
    })

    it('should include days with no spending', () => {
      // Arrange
      const transactions = [
        {
          amount_number: 50,
          date_string: '2024-01-15',
          category: {
            id: 'cat-1',
            name: 'Food',
            imageUrl: null,
            isTransferCategory: false,
            created_at_string: null,
            updated_at_string: null,
          },
          subcategory: null,
        },
      ]
      const startDate = new Date('2024-01-15')
      const endDate = new Date('2024-01-17')

      // Act
      const result = prepareDailySpendingData(transactions, startDate, endDate)

      // Assert
      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({ day: 'Jan 15', spending: 50 })
      expect(result[1]).toMatchObject({ day: 'Jan 16', spending: 0 })
      expect(result[2]).toMatchObject({ day: 'Jan 17', spending: 0 })
    })

    it('should exclude transfer categories from daily spending', () => {
      // Arrange
      const transactions = [
        {
          amount_number: 50,
          date_string: '2024-01-15',
          category: {
            id: 'cat-1',
            name: 'Food',
            imageUrl: null,
            isTransferCategory: false,
            created_at_string: null,
            updated_at_string: null,
          },
          subcategory: null,
        },
        {
          amount_number: 200,
          date_string: '2024-01-15',
          category: {
            id: 'cat-transfer',
            name: 'Transfer',
            imageUrl: null,
            isTransferCategory: true,
            created_at_string: null,
            updated_at_string: null,
          },
          subcategory: null,
        },
      ]
      const startDate = new Date('2024-01-15')
      const endDate = new Date('2024-01-15')

      // Act
      const result = prepareDailySpendingData(transactions, startDate, endDate)

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ spending: 50 })
    })
  })
})
