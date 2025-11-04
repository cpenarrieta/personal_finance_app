/**
 * Unit tests for auth-helpers
 *
 * Tests cover:
 * 1. getSession() - success and error handling
 * 2. requireAuth() - with/without session, redirects
 * 3. validateAllowedEmail() - email validation, env var checks
 */

import { getSession, requireAuth, validateAllowedEmail } from "../auth-helpers";

// Mock modules
jest.mock("../auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import { auth } from "../auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

describe("getSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return session when auth.api.getSession succeeds", async () => {
    const mockSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      },
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    const result = await getSession();

    expect(result).toEqual(mockSession);
    expect(auth.api.getSession).toHaveBeenCalledWith({
      headers: mockHeaders,
    });
  });

  it("should return null when auth.api.getSession throws an error", async () => {
    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockRejectedValue(
      new Error("Session error")
    );

    // Spy on console.error to suppress output during test
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await getSession();

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error getting session:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("should return null when session is null", async () => {
    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(null);

    const result = await getSession();

    expect(result).toBeNull();
  });
});

describe("requireAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return session when user is authenticated", async () => {
    const mockSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      },
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    const result = await requireAuth();

    expect(result).toEqual(mockSession);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("should redirect to /login when session is null", async () => {
    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(null);

    await requireAuth();

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("should redirect to /login when session.user is null", async () => {
    const mockSession = {
      user: null,
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    await requireAuth();

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("should redirect to /login when session.user is undefined", async () => {
    const mockSession = {
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    await requireAuth();

    expect(redirect).toHaveBeenCalledWith("/login");
  });
});

describe("validateAllowedEmail", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it("should return session when user email matches ALLOWED_EMAIL", async () => {
    process.env.ALLOWED_EMAIL = "allowed@example.com";

    const mockSession = {
      user: {
        id: "user-123",
        email: "allowed@example.com",
        name: "Allowed User",
      },
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    const result = await validateAllowedEmail();

    expect(result).toEqual(mockSession);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("should handle case-insensitive email matching", async () => {
    process.env.ALLOWED_EMAIL = "Allowed@Example.COM";

    const mockSession = {
      user: {
        id: "user-123",
        email: "allowed@example.com",
        name: "Allowed User",
      },
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    const result = await validateAllowedEmail();

    expect(result).toEqual(mockSession);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("should trim whitespace from emails before comparing", async () => {
    process.env.ALLOWED_EMAIL = "  allowed@example.com  ";

    const mockSession = {
      user: {
        id: "user-123",
        email: "  allowed@example.com  ",
        name: "Allowed User",
      },
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    const result = await validateAllowedEmail();

    expect(result).toEqual(mockSession);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("should redirect when user email does not match ALLOWED_EMAIL", async () => {
    process.env.ALLOWED_EMAIL = "allowed@example.com";

    const mockSession = {
      user: {
        id: "user-123",
        email: "unauthorized@example.com",
        name: "Unauthorized User",
      },
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    await validateAllowedEmail();

    expect(redirect).toHaveBeenCalledWith("/login?error=unauthorized");
  });

  it("should throw error when ALLOWED_EMAIL is not configured", async () => {
    delete process.env.ALLOWED_EMAIL;

    const mockSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      },
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    await expect(validateAllowedEmail()).rejects.toThrow(
      "ALLOWED_EMAIL not configured"
    );
  });

  it("should throw error when ALLOWED_EMAIL is empty string", async () => {
    process.env.ALLOWED_EMAIL = "";

    const mockSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      },
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    await expect(validateAllowedEmail()).rejects.toThrow(
      "ALLOWED_EMAIL not configured"
    );
  });

  it("should redirect when user email is null", async () => {
    process.env.ALLOWED_EMAIL = "allowed@example.com";

    const mockSession = {
      user: {
        id: "user-123",
        email: null,
        name: "Test User",
      },
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    await validateAllowedEmail();

    expect(redirect).toHaveBeenCalledWith("/login?error=unauthorized");
  });

  it("should redirect when user email is undefined", async () => {
    process.env.ALLOWED_EMAIL = "allowed@example.com";

    const mockSession = {
      user: {
        id: "user-123",
        name: "Test User",
      },
      session: {
        id: "session-123",
        expiresAt: new Date(),
      },
    };

    const mockHeaders = new Headers();
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    (auth.api.getSession as jest.Mock).mockResolvedValue(mockSession);

    await validateAllowedEmail();

    expect(redirect).toHaveBeenCalledWith("/login?error=unauthorized");
  });
});
