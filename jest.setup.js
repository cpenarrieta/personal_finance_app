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
