// Mock Prisma client for testing
import { Prisma } from "@prisma/generated"

export const mockPrismaClient = {
  transaction: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  plaidAccount: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  item: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  security: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  holding: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  investmentTransaction: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
}

export const prisma = mockPrismaClient as any

// Mock Prisma.Decimal
export { Prisma }
