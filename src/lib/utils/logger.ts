/**
 * Logger utility that logs to console (development) and Sentry (production)
 *
 * In development: Only logs to console
 * In production: Logs to both console and Sentry
 */

import * as Sentry from "@sentry/nextjs"
import { inspect } from "util"

const isProduction = process.env.NODE_ENV === "production"

interface LogAttributes {
  [key: string]: unknown
}

type LogLevel = "log" | "warn" | "error" | "debug" | "trace"
type SentryLogLevel = "info" | "warn" | "error" | "debug" | "trace"

/**
 * Format attributes for logging
 * - Development: Use colors for better readability
 * - Production: No colors (Vercel logs don't support ANSI codes)
 */
function formatAttributes(attributes: LogAttributes): string {
  return inspect(attributes, { depth: null, colors: !isProduction })
}

/**
 * Internal helper to log to console
 */
function logToConsole(
  level: LogLevel,
  message: string,
  formattedAttributes?: string,
  error?: unknown,
): void {
  const args: unknown[] = [message]

  if (formattedAttributes) {
    args.push(formattedAttributes)
  }

  if (error !== undefined) {
    args.push(error)
  }

  console[level](...args)
}

/**
 * Internal helper to log to Sentry
 */
function logToSentry(level: SentryLogLevel, message: string, attributes?: LogAttributes): void {
  if (!isProduction) return

  if (attributes) {
    Sentry.logger[level](message, attributes)
  } else {
    Sentry.logger[level](message)
  }
}

/**
 * Log an informational message
 */
export function logInfo(message: string, attributes?: LogAttributes): void {
  const formatted = attributes ? formatAttributes(attributes) : undefined
  logToConsole("log", message, formatted)
  logToSentry("info", message, attributes)
}

/**
 * Log a warning message
 */
export function logWarn(message: string, attributes?: LogAttributes): void {
  const formatted = attributes ? formatAttributes(attributes) : undefined
  logToConsole("warn", message, formatted)
  logToSentry("warn", message, attributes)
}

/**
 * Log an error message
 */
export function logError(message: string, error?: unknown, attributes?: LogAttributes): void {
  const errorObj = error instanceof Error ? error : undefined
  const combinedAttrs = {
    ...attributes,
    ...(errorObj && { error: errorObj.message, stack: errorObj.stack }),
  }

  // Log to console with error object
  if (error !== undefined) {
    console.error(message, error, attributes ? formatAttributes(attributes) : "")
  } else if (attributes) {
    console.error(message, formatAttributes(attributes))
  } else {
    console.error(message)
  }

  logToSentry("error", message, Object.keys(combinedAttrs).length > 0 ? combinedAttrs : undefined)
}

/**
 * Log a debug message
 */
export function logDebug(message: string, attributes?: LogAttributes): void {
  const formatted = attributes ? formatAttributes(attributes) : undefined
  logToConsole("debug", message, formatted)
  logToSentry("debug", message, attributes)
}

/**
 * Log a trace message
 */
export function logTrace(message: string, attributes?: LogAttributes): void {
  const formatted = attributes ? formatAttributes(attributes) : undefined
  logToConsole("trace", message, formatted)
  logToSentry("trace", message, attributes)
}
