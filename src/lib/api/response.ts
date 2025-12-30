/**
 * Standardized API response utilities
 *
 * Usage:
 *   return apiSuccess({ user: user })
 *   return apiError("Not found", 404, "NOT_FOUND")
 */

import { NextResponse } from "next/server"

/**
 * Standard API response shape
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: unknown
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Create a successful API response
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Create an error API response
 *
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 500)
 * @param code - Machine-readable error code (e.g., "NOT_FOUND", "VALIDATION_ERROR")
 * @param details - Additional error details (e.g., validation errors)
 */
export function apiError(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
  }

  if (code) {
    response.code = code
  }

  if (details !== undefined) {
    response.details = details
  }

  return NextResponse.json(response, { status })
}

/**
 * Common error responses
 */
export const apiErrors = {
  notFound: (resource: string = "Resource") => apiError(`${resource} not found`, 404, "NOT_FOUND"),

  badRequest: (message: string, details?: unknown) => apiError(message, 400, "BAD_REQUEST", details),

  validationError: (message: string, details?: unknown) => apiError(message, 400, "VALIDATION_ERROR", details),

  unauthorized: (message: string = "Unauthorized") => apiError(message, 401, "UNAUTHORIZED"),

  forbidden: (message: string = "Forbidden") => apiError(message, 403, "FORBIDDEN"),

  conflict: (message: string) => apiError(message, 409, "CONFLICT"),

  internalError: (message: string = "Internal server error") => apiError(message, 500, "INTERNAL_ERROR"),
}
