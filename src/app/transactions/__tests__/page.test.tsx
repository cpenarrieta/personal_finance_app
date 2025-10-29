/**
 * Unit tests for Transactions Page - Happy Path
 *
 * Tests that transactions from database appear on screen
 */

import { render, screen } from "@testing-library/react";
import TransactionsPage from "../page";
import * as prismaModule from "@/lib/prisma";
import {
  CategoryForClient,
  PlaidAccountForClient,
  TagForClient,
  TransactionForClient,
} from "@/types";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
    plaidAccount: {
      findMany: jest.fn(),
    },
  },
}));

// Mock Next.js Link component
jest.mock("next/link", () => {
  return function Link({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock TransactionsPageClient component
jest.mock("@/components/TransactionsPageClient", () => ({
  TransactionsPageClient: ({
    transactions,
    categories,
    tags,
    accounts,
  }: {
    transactions: TransactionForClient[];
    categories: CategoryForClient[];
    tags: TagForClient[];
    accounts: PlaidAccountForClient[];
  }) => (
    <div data-testid="transactions-page-client">
      <div data-testid="transaction-count">{transactions.length}</div>
      <div data-testid="category-count">{categories.length}</div>
      <div data-testid="tag-count">{tags.length}</div>
      <div data-testid="account-count">{accounts.length}</div>
      {transactions.map((t: TransactionForClient) => (
        <div key={t.id} data-testid={`transaction-${t.id}`}>
          <span data-testid={`transaction-name-${t.id}`}>{t.name}</span>
          <span data-testid={`transaction-amount-${t.id}`}>
            {t.amount_number}
          </span>
          <span data-testid={`transaction-date-${t.id}`}>{t.date_string}</span>
          {t.account && (
            <span data-testid={`transaction-account-${t.id}`}>
              {t.account.name}
            </span>
          )}
          {t.tags.map((tag: TagForClient) => (
            <span
              key={tag.id}
              data-testid={`transaction-${t.id}-tag-${tag.id}`}
            >
              {tag.name}
            </span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

describe("TransactionsPage - Happy Path", () => {
  const mockTransaction1 = {
    id: "tx-1",
    plaidTransactionId: "plaid-tx-1",
    accountId: "acc-1",
    amount_number: -50.25,
    isoCurrencyCode: "USD",
    date_string: "2024-01-15",
    authorized_date_string: "2024-01-14",
    pending: false,
    merchantName: "Coffee Shop",
    name: "Coffee Purchase",
    plaidCategory: "FOOD_AND_DRINK",
    plaidSubcategory: "FOOD_AND_DRINK_COFFEE",
    paymentChannel: "in store",
    pendingTransactionId: null,
    logoUrl: "https://example.com/logo.png",
    categoryIconUrl: "https://example.com/icon.png",
    categoryId: "cat-1",
    subcategoryId: "subcat-1",
    notes: null,
    isSplit: false,
    parentTransactionId: null,
    originalTransactionId: null,
    created_at_string: "2024-01-15T10:00:00Z",
    updated_at_string: "2024-01-15T10:00:00Z",
    account: {
      id: "acc-1",
      name: "Checking Account",
      type: "depository",
      mask: "1234",
    },
    category: {
      id: "cat-1",
      name: "Food & Drink",
      imageUrl: null,
      created_at_string: "2024-01-01T00:00:00Z",
      updated_at_string: "2024-01-01T00:00:00Z",
    },
    subcategory: {
      id: "subcat-1",
      categoryId: "cat-1",
      name: "Coffee",
      imageUrl: null,
      created_at_string: "2024-01-01T00:00:00Z",
      updated_at_string: "2024-01-01T00:00:00Z",
    },
    tags: [
      {
        tag: {
          id: "tag-1",
          name: "Work",
          color: "#FF0000",
          created_at_string: "2024-01-01T00:00:00Z",
          updated_at_string: "2024-01-01T00:00:00Z",
        },
      },
    ],
  };

  const mockTransaction2 = {
    id: "tx-2",
    plaidTransactionId: "plaid-tx-2",
    accountId: "acc-1",
    amount_number: -125.5,
    isoCurrencyCode: "USD",
    date_string: "2024-01-16",
    authorized_date_string: "2024-01-16",
    pending: false,
    merchantName: "Grocery Store",
    name: "Groceries",
    plaidCategory: "FOOD_AND_DRINK",
    plaidSubcategory: "FOOD_AND_DRINK_GROCERIES",
    paymentChannel: "in store",
    pendingTransactionId: null,
    logoUrl: null,
    categoryIconUrl: null,
    categoryId: "cat-1",
    subcategoryId: null,
    notes: "Weekly shopping",
    isSplit: false,
    parentTransactionId: null,
    originalTransactionId: null,
    created_at_string: "2024-01-16T10:00:00Z",
    updated_at_string: "2024-01-16T10:00:00Z",
    account: {
      id: "acc-1",
      name: "Checking Account",
      type: "depository",
      mask: "1234",
    },
    category: {
      id: "cat-1",
      name: "Food & Drink",
      imageUrl: null,
      created_at_string: "2024-01-01T00:00:00Z",
      updated_at_string: "2024-01-01T00:00:00Z",
    },
    subcategory: null,
    tags: [],
  };

  const mockCategory = {
    id: "cat-1",
    name: "Food & Drink",
    imageUrl: null,
    groupType: "expense",
    displayOrder: 1,
    created_at_string: "2024-01-01T00:00:00Z",
    updated_at_string: "2024-01-01T00:00:00Z",
    subcategories: [
      {
        id: "subcat-1",
        categoryId: "cat-1",
        name: "Coffee",
        imageUrl: null,
        created_at_string: "2024-01-01T00:00:00Z",
        updated_at_string: "2024-01-01T00:00:00Z",
      },
    ],
  };

  const mockTag = {
    id: "tag-1",
    name: "Work",
    color: "#FF0000",
    created_at_string: "2024-01-01T00:00:00Z",
    updated_at_string: "2024-01-01T00:00:00Z",
  };

  const mockAccount = {
    id: "acc-1",
    plaidAccountId: "plaid-acc-1",
    itemId: "item-1",
    name: "Checking Account",
    officialName: "Main Checking",
    mask: "1234",
    type: "depository",
    subtype: "checking",
    currency: "USD",
    current_balance_number: 1000.0,
    available_balance_number: 950.0,
    credit_limit_number: null,
    balance_updated_at_string: "2024-01-16T00:00:00Z",
    created_at_string: "2024-01-01T00:00:00Z",
    updated_at_string: "2024-01-16T00:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render transactions from database", async () => {
    // Arrange
    (prismaModule.prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      mockTransaction1,
      mockTransaction2,
    ]);
    (prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue([
      mockCategory,
    ]);
    (prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue([
      mockTag,
    ]);
    (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
      mockAccount,
    ]);

    // Act
    const result = await TransactionsPage();
    render(result);

    // Assert - Verify page structure
    expect(screen.getByText("← Back to Home")).toBeInTheDocument();
    expect(screen.getByTestId("transactions-page-client")).toBeInTheDocument();
  });

  it("should display correct number of transactions", async () => {
    // Arrange
    (prismaModule.prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      mockTransaction1,
      mockTransaction2,
    ]);
    (prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue([
      mockCategory,
    ]);
    (prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue([
      mockTag,
    ]);
    (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
      mockAccount,
    ]);

    // Act
    const result = await TransactionsPage();
    render(result);

    // Assert
    expect(screen.getByTestId("transaction-count")).toHaveTextContent("2");
  });

  it("should display transaction details", async () => {
    // Arrange
    (prismaModule.prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      mockTransaction1,
    ]);
    (prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue([
      mockCategory,
    ]);
    (prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue([
      mockTag,
    ]);
    (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
      mockAccount,
    ]);

    // Act
    const result = await TransactionsPage();
    render(result);

    // Assert
    expect(screen.getByTestId("transaction-tx-1")).toBeInTheDocument();
    expect(screen.getByTestId("transaction-name-tx-1")).toHaveTextContent(
      "Coffee Purchase"
    );
    expect(screen.getByTestId("transaction-amount-tx-1")).toHaveTextContent(
      "-50.25"
    );
    expect(screen.getByTestId("transaction-date-tx-1")).toHaveTextContent(
      "2024-01-15"
    );
    expect(screen.getByTestId("transaction-account-tx-1")).toHaveTextContent(
      "Checking Account"
    );
  });

  it("should flatten tags structure correctly", async () => {
    // Arrange
    (prismaModule.prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      mockTransaction1,
    ]);
    (prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue([
      mockCategory,
    ]);
    (prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue([
      mockTag,
    ]);
    (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
      mockAccount,
    ]);

    // Act
    const result = await TransactionsPage();
    render(result);

    // Assert - Tags should be flattened from tags.tag to tags
    expect(screen.getByTestId("transaction-tx-1-tag-tag-1")).toHaveTextContent(
      "Work"
    );
  });

  it("should pass categories, tags, and accounts to client component", async () => {
    // Arrange
    (prismaModule.prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      mockTransaction1,
    ]);
    (prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue([
      mockCategory,
    ]);
    (prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue([
      mockTag,
    ]);
    (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
      mockAccount,
    ]);

    // Act
    const result = await TransactionsPage();
    render(result);

    // Assert
    expect(screen.getByTestId("category-count")).toHaveTextContent("1");
    expect(screen.getByTestId("tag-count")).toHaveTextContent("1");
    expect(screen.getByTestId("account-count")).toHaveTextContent("1");
  });

  it("should filter out split transactions (isSplit=false)", async () => {
    // Arrange - Verify the query filters out split transactions
    (prismaModule.prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      mockTransaction1,
    ]);
    (prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue([
      mockCategory,
    ]);
    (prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue([
      mockTag,
    ]);
    (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
      mockAccount,
    ]);

    // Act
    await TransactionsPage();

    // Assert
    expect(prismaModule.prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isSplit: false,
        },
      })
    );
  });

  it("should order transactions by date descending", async () => {
    // Arrange
    (prismaModule.prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      mockTransaction2,
      mockTransaction1,
    ]);
    (prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue([
      mockCategory,
    ]);
    (prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue([
      mockTag,
    ]);
    (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
      mockAccount,
    ]);

    // Act
    await TransactionsPage();

    // Assert
    expect(prismaModule.prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { date: "desc" },
      })
    );
  });

  it("should handle empty transactions list", async () => {
    // Arrange
    (prismaModule.prisma.transaction.findMany as jest.Mock).mockResolvedValue(
      []
    );
    (prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue([
      mockCategory,
    ]);
    (prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue([
      mockTag,
    ]);
    (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
      mockAccount,
    ]);

    // Act
    const result = await TransactionsPage();
    render(result);

    // Assert
    expect(screen.getByTestId("transaction-count")).toHaveTextContent("0");
  });

  it("should handle transactions without tags", async () => {
    // Arrange
    (prismaModule.prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      mockTransaction2,
    ]);
    (prismaModule.prisma.category.findMany as jest.Mock).mockResolvedValue([
      mockCategory,
    ]);
    (prismaModule.prisma.tag.findMany as jest.Mock).mockResolvedValue([
      mockTag,
    ]);
    (prismaModule.prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
      mockAccount,
    ]);

    // Act
    const result = await TransactionsPage();
    render(result);

    // Assert
    expect(screen.getByTestId("transaction-tx-2")).toBeInTheDocument();
    expect(screen.getByTestId("transaction-name-tx-2")).toHaveTextContent(
      "Groceries"
    );
  });
});
