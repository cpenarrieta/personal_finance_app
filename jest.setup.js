// Jest setup file for global test configuration
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@testing-library/jest-dom');

// Polyfill TextEncoder/TextDecoder for Node.js environment
// Required by Next.js cache functions
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js cache functions
jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

// Mock Prisma error classes
class PrismaClientKnownRequestError extends Error {
  constructor(message, { code, clientVersion, meta } = {}) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = code;
    this.clientVersion = clientVersion;
    this.meta = meta;
  }
}

class PrismaClientUnknownRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrismaClientUnknownRequestError';
  }
}

class PrismaClientValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrismaClientValidationError';
  }
}

// Mock Prisma generated client (ESM module that Jest can't load directly)
jest.mock('@prisma/generated', () => ({
  Prisma: {
    TransactionScalarFieldEnum: {},
    PrismaClientKnownRequestError,
    PrismaClientUnknownRequestError,
    PrismaClientValidationError,
    Decimal: class Decimal {
      constructor(value) {
        this.value = value;
      }
      toString() {
        return String(this.value);
      }
      toNumber() {
        return Number(this.value);
      }
    },
  },
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    transaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
  })),
  CategoryGroupType: {
    EXPENSES: 'EXPENSES',
    INCOME: 'INCOME',
    INVESTMENT: 'INVESTMENT',
  },
}));

// Mock Prisma generated enums (browser-safe)
jest.mock('@prisma/generated/enums', () => ({
  CategoryGroupType: {
    EXPENSES: 'EXPENSES',
    INCOME: 'INCOME',
    INVESTMENT: 'INVESTMENT',
  },
}));

// Mock Prisma generated browser (browser-safe)
jest.mock('@prisma/generated/browser', () => ({
  Prisma: {},
  CategoryGroupType: {
    EXPENSES: 'EXPENSES',
    INCOME: 'INCOME',
    INVESTMENT: 'INVESTMENT',
  },
}));

// Mock convex/react (npm package)
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useConvex: jest.fn(),
  ConvexProvider: ({ children }) => children,
}));

// Mock convex/nextjs
jest.mock('convex/nextjs', () => ({
  fetchQuery: jest.fn(),
  fetchMutation: jest.fn(),
  preloadQuery: jest.fn(),
}));
