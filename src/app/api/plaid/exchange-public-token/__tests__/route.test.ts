/**
 * @jest-environment node
 *
 * Unit tests for POST /api/plaid/exchange-public-token
 *
 * Tests cover:
 * 1. Successful token exchange and account creation
 * 2. Institution lookup and creation
 * 3. Item creation with access token
 * 4. Multiple accounts creation with balances
 * 5. Account upsert (update existing accounts)
 * 6. Decimal balance handling
 * 7. Plaid API errors
 * 8. Database errors
 */

import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getPlaidClient } from "@/lib/plaid";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { CountryCode } from "plaid";

// Mock Plaid client
jest.mock("@/lib/plaid", () => ({
  getPlaidClient: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    institution: {
      upsert: jest.fn(),
    },
    item: {
      upsert: jest.fn(),
    },
    plaidAccount: {
      upsert: jest.fn(),
    },
  },
}));

describe("POST /api/plaid/exchange-public-token", () => {
  let mockPlaidClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlaidClient = {
      itemPublicTokenExchange: jest.fn(),
      itemGet: jest.fn(),
      institutionsGetById: jest.fn(),
      accountsGet: jest.fn(),
    };

    (getPlaidClient as jest.Mock).mockReturnValue(mockPlaidClient);
  });

  const createMockRequest = (body: any): NextRequest => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  const mockExchangeResponse = {
    data: {
      access_token: "access-token-123",
      item_id: "item-id-123",
    },
  };

  const mockItemResponse = {
    data: {
      item: {
        institution_id: "ins_123",
      },
    },
  };

  const mockInstitutionResponse = {
    data: {
      institution: {
        name: "Chase Bank",
      },
    },
  };

  const mockAccountsResponse = {
    data: {
      accounts: [
        {
          account_id: "account-1",
          name: "Checking Account",
          official_name: "Chase Total Checking",
          mask: "1234",
          type: "depository",
          subtype: "checking",
          balances: {
            current: 1000.50,
            available: 950.25,
            limit: null,
            iso_currency_code: "USD",
          },
        },
        {
          account_id: "account-2",
          name: "Credit Card",
          official_name: "Chase Sapphire Reserve",
          mask: "5678",
          type: "credit",
          subtype: "credit card",
          balances: {
            current: -500.00,
            available: 9500.00,
            limit: 10000.00,
            iso_currency_code: "USD",
          },
        },
      ],
    },
  };

  describe("Successful Token Exchange", () => {
    it("should exchange public token and create institution, item, and accounts", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockResolvedValue(mockItemResponse);
      mockPlaidClient.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );
      mockPlaidClient.accountsGet.mockResolvedValue(mockAccountsResponse);

      const mockInstitution = {
        id: "ins_123",
        name: "Chase Bank",
      };

      const mockItem = {
        id: "db-item-123",
        plaidItemId: "item-id-123",
        accessToken: "access-token-123",
        institutionId: "ins_123",
      };

      (prisma.institution.upsert as jest.Mock).mockResolvedValue(
        mockInstitution
      );
      (prisma.item.upsert as jest.Mock).mockResolvedValue(mockItem);
      (prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({});

      const req = createMockRequest({ public_token: "public-token-123" });
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ ok: true });

      // Verify Plaid API calls
      expect(mockPlaidClient.itemPublicTokenExchange).toHaveBeenCalledWith({
        public_token: "public-token-123",
      });
      expect(mockPlaidClient.itemGet).toHaveBeenCalledWith({
        access_token: "access-token-123",
      });
      expect(mockPlaidClient.institutionsGetById).toHaveBeenCalledWith({
        institution_id: "ins_123",
        country_codes: [CountryCode.Ca],
      });
      expect(mockPlaidClient.accountsGet).toHaveBeenCalledWith({
        access_token: "access-token-123",
      });

      // Verify database upserts
      expect(prisma.institution.upsert).toHaveBeenCalledWith({
        where: { id: "ins_123" },
        update: { name: "Chase Bank" },
        create: { id: "ins_123", name: "Chase Bank" },
      });

      expect(prisma.item.upsert).toHaveBeenCalledWith({
        where: { plaidItemId: "item-id-123" },
        update: { accessToken: "access-token-123", institutionId: "ins_123" },
        create: {
          plaidItemId: "item-id-123",
          accessToken: "access-token-123",
          institutionId: "ins_123",
        },
      });

      expect(prisma.plaidAccount.upsert).toHaveBeenCalledTimes(2);
    });

    it("should handle account creation with all balance fields", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockResolvedValue(mockItemResponse);
      mockPlaidClient.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );
      mockPlaidClient.accountsGet.mockResolvedValue(mockAccountsResponse);

      (prisma.institution.upsert as jest.Mock).mockResolvedValue({
        id: "ins_123",
        name: "Chase Bank",
      });
      (prisma.item.upsert as jest.Mock).mockResolvedValue({
        id: "db-item-123",
      });
      (prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({});

      const req = createMockRequest({ public_token: "public-token-123" });
      await POST(req);

      // Verify first account (checking)
      expect(prisma.plaidAccount.upsert).toHaveBeenNthCalledWith(1, {
        where: { plaidAccountId: "account-1" },
        update: {
          itemId: "db-item-123",
          name: "Checking Account",
          officialName: "Chase Total Checking",
          mask: "1234",
          type: "depository",
          subtype: "checking",
          currency: "USD",
          currentBalance: expect.any(Decimal),
          availableBalance: expect.any(Decimal),
          creditLimit: null,
          balanceUpdatedAt: expect.any(Date),
        },
        create: {
          plaidAccountId: "account-1",
          itemId: "db-item-123",
          name: "Checking Account",
          officialName: "Chase Total Checking",
          mask: "1234",
          type: "depository",
          subtype: "checking",
          currency: "USD",
          currentBalance: expect.any(Decimal),
          availableBalance: expect.any(Decimal),
          creditLimit: null,
          balanceUpdatedAt: expect.any(Date),
        },
      });

      // Verify second account (credit card with limit)
      expect(prisma.plaidAccount.upsert).toHaveBeenNthCalledWith(2, {
        where: { plaidAccountId: "account-2" },
        update: expect.objectContaining({
          name: "Credit Card",
          creditLimit: expect.any(Decimal),
        }),
        create: expect.objectContaining({
          plaidAccountId: "account-2",
          name: "Credit Card",
          creditLimit: expect.any(Decimal),
        }),
      });
    });

    it("should handle account with null balances", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockResolvedValue(mockItemResponse);
      mockPlaidClient.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );

      const accountsWithNullBalances = {
        data: {
          accounts: [
            {
              account_id: "account-1",
              name: "Investment Account",
              official_name: null,
              mask: null,
              type: "investment",
              subtype: null,
              balances: {
                current: null,
                available: null,
                limit: null,
                iso_currency_code: null,
              },
            },
          ],
        },
      };

      mockPlaidClient.accountsGet.mockResolvedValue(accountsWithNullBalances);

      (prisma.institution.upsert as jest.Mock).mockResolvedValue({
        id: "ins_123",
        name: "Chase Bank",
      });
      (prisma.item.upsert as jest.Mock).mockResolvedValue({
        id: "db-item-123",
      });
      (prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({});

      const req = createMockRequest({ public_token: "public-token-123" });
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(prisma.plaidAccount.upsert).toHaveBeenCalledWith({
        where: { plaidAccountId: "account-1" },
        update: {
          itemId: "db-item-123",
          name: "Investment Account",
          officialName: null,
          mask: null,
          type: "investment",
          subtype: null,
          currency: null,
          currentBalance: null,
          availableBalance: null,
          creditLimit: null,
          balanceUpdatedAt: expect.any(Date),
        },
        create: {
          plaidAccountId: "account-1",
          itemId: "db-item-123",
          name: "Investment Account",
          officialName: null,
          mask: null,
          type: "investment",
          subtype: null,
          currency: null,
          currentBalance: null,
          availableBalance: null,
          creditLimit: null,
          balanceUpdatedAt: expect.any(Date),
        },
      });
    });

    it("should use account name fallback when official_name is not available", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockResolvedValue(mockItemResponse);
      mockPlaidClient.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );

      const accountsWithNoNames = {
        data: {
          accounts: [
            {
              account_id: "account-1",
              name: null,
              official_name: null,
              mask: null,
              type: "depository",
              subtype: "checking",
              balances: {
                current: 100.00,
                available: 100.00,
                limit: null,
                iso_currency_code: "USD",
              },
            },
          ],
        },
      };

      mockPlaidClient.accountsGet.mockResolvedValue(accountsWithNoNames);

      (prisma.institution.upsert as jest.Mock).mockResolvedValue({
        id: "ins_123",
        name: "Chase Bank",
      });
      (prisma.item.upsert as jest.Mock).mockResolvedValue({
        id: "db-item-123",
      });
      (prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({});

      const req = createMockRequest({ public_token: "public-token-123" });
      await POST(req);

      expect(prisma.plaidAccount.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            name: "Account", // Fallback value
          }),
          create: expect.objectContaining({
            name: "Account", // Fallback value
          }),
        })
      );
    });
  });

  describe("Institution Handling", () => {
    it("should handle unknown institution_id", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );

      const itemWithNoInstitution = {
        data: {
          item: {
            institution_id: null,
          },
        },
      };

      mockPlaidClient.itemGet.mockResolvedValue(itemWithNoInstitution);
      mockPlaidClient.accountsGet.mockResolvedValue({ data: { accounts: [] } });

      (prisma.institution.upsert as jest.Mock).mockResolvedValue({
        id: "unknown",
        name: "Unknown",
      });
      (prisma.item.upsert as jest.Mock).mockResolvedValue({
        id: "db-item-123",
      });

      const req = createMockRequest({ public_token: "public-token-123" });
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(prisma.institution.upsert).toHaveBeenCalledWith({
        where: { id: "unknown" },
        update: { name: "Unknown" },
        create: { id: "unknown", name: "Unknown" },
      });
    });

    it("should handle institution_id as 'unknown' string", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );

      const itemWithUnknownInstitution = {
        data: {
          item: {
            institution_id: "unknown",
          },
        },
      };

      mockPlaidClient.itemGet.mockResolvedValue(itemWithUnknownInstitution);
      mockPlaidClient.accountsGet.mockResolvedValue({ data: { accounts: [] } });

      (prisma.institution.upsert as jest.Mock).mockResolvedValue({
        id: "unknown",
        name: "Unknown",
      });
      (prisma.item.upsert as jest.Mock).mockResolvedValue({
        id: "db-item-123",
      });

      const req = createMockRequest({ public_token: "public-token-123" });
      await POST(req);

      expect(mockPlaidClient.institutionsGetById).not.toHaveBeenCalled();
      expect(prisma.institution.upsert).toHaveBeenCalledWith({
        where: { id: "unknown" },
        update: { name: "Unknown" },
        create: { id: "unknown", name: "Unknown" },
      });
    });
  });

  describe("Plaid API Errors", () => {
    it("should throw error when token exchange fails", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockRejectedValue(
        new Error("Invalid public token")
      );

      const req = createMockRequest({ public_token: "invalid-token" });

      await expect(POST(req)).rejects.toThrow("Invalid public token");
    });

    it("should throw error when itemGet fails", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockRejectedValue(
        new Error("Item fetch failed")
      );

      const req = createMockRequest({ public_token: "public-token-123" });

      await expect(POST(req)).rejects.toThrow("Item fetch failed");
    });

    it("should throw error when institutionsGetById fails", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockResolvedValue(mockItemResponse);
      mockPlaidClient.institutionsGetById.mockRejectedValue(
        new Error("Institution fetch failed")
      );

      const req = createMockRequest({ public_token: "public-token-123" });

      await expect(POST(req)).rejects.toThrow("Institution fetch failed");
    });

    it("should throw error when accountsGet fails", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockResolvedValue(mockItemResponse);
      mockPlaidClient.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );
      mockPlaidClient.accountsGet.mockRejectedValue(
        new Error("Accounts fetch failed")
      );

      (prisma.institution.upsert as jest.Mock).mockResolvedValue({
        id: "ins_123",
      });
      (prisma.item.upsert as jest.Mock).mockResolvedValue({ id: "db-item-123" });

      const req = createMockRequest({ public_token: "public-token-123" });

      await expect(POST(req)).rejects.toThrow("Accounts fetch failed");
    });
  });

  describe("Database Errors", () => {
    it("should throw error when institution upsert fails", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockResolvedValue(mockItemResponse);
      mockPlaidClient.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );

      (prisma.institution.upsert as jest.Mock).mockRejectedValue(
        new Error("Institution upsert failed")
      );

      const req = createMockRequest({ public_token: "public-token-123" });

      await expect(POST(req)).rejects.toThrow("Institution upsert failed");
    });

    it("should throw error when item upsert fails", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockResolvedValue(mockItemResponse);
      mockPlaidClient.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );

      (prisma.institution.upsert as jest.Mock).mockResolvedValue({
        id: "ins_123",
      });
      (prisma.item.upsert as jest.Mock).mockRejectedValue(
        new Error("Item upsert failed")
      );

      const req = createMockRequest({ public_token: "public-token-123" });

      await expect(POST(req)).rejects.toThrow("Item upsert failed");
    });

    it("should throw error when account upsert fails", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockResolvedValue(mockItemResponse);
      mockPlaidClient.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );
      mockPlaidClient.accountsGet.mockResolvedValue(mockAccountsResponse);

      (prisma.institution.upsert as jest.Mock).mockResolvedValue({
        id: "ins_123",
      });
      (prisma.item.upsert as jest.Mock).mockResolvedValue({ id: "db-item-123" });
      (prisma.plaidAccount.upsert as jest.Mock).mockRejectedValue(
        new Error("Account upsert failed")
      );

      const req = createMockRequest({ public_token: "public-token-123" });

      await expect(POST(req)).rejects.toThrow("Account upsert failed");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty accounts list", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockResolvedValue(mockItemResponse);
      mockPlaidClient.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );
      mockPlaidClient.accountsGet.mockResolvedValue({ data: { accounts: [] } });

      (prisma.institution.upsert as jest.Mock).mockResolvedValue({
        id: "ins_123",
      });
      (prisma.item.upsert as jest.Mock).mockResolvedValue({ id: "db-item-123" });

      const req = createMockRequest({ public_token: "public-token-123" });
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(prisma.plaidAccount.upsert).not.toHaveBeenCalled();
    });

    it("should handle multiple accounts sequentially", async () => {
      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(
        mockExchangeResponse
      );
      mockPlaidClient.itemGet.mockResolvedValue(mockItemResponse);
      mockPlaidClient.institutionsGetById.mockResolvedValue(
        mockInstitutionResponse
      );

      const manyAccounts = {
        data: {
          accounts: Array.from({ length: 5 }, (_, i) => ({
            account_id: `account-${i}`,
            name: `Account ${i}`,
            official_name: null,
            mask: `${i}`,
            type: "depository",
            subtype: "checking",
            balances: {
              current: 1000 + i,
              available: 900 + i,
              limit: null,
              iso_currency_code: "USD",
            },
          })),
        },
      };

      mockPlaidClient.accountsGet.mockResolvedValue(manyAccounts);

      (prisma.institution.upsert as jest.Mock).mockResolvedValue({
        id: "ins_123",
      });
      (prisma.item.upsert as jest.Mock).mockResolvedValue({ id: "db-item-123" });
      (prisma.plaidAccount.upsert as jest.Mock).mockResolvedValue({});

      const req = createMockRequest({ public_token: "public-token-123" });
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(prisma.plaidAccount.upsert).toHaveBeenCalledTimes(5);
    });
  });
});
