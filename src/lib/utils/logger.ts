/**
 * Logger utility that logs to console (development) and Sentry (production)
 *
 * In development: Only logs to console
 * In production: Logs to both console and Sentry
 */

import * as Sentry from "@sentry/nextjs"
import { inspect } from "util"

const isProduction = process.env.NODE_ENV === "production"

/**
 * Format attributes for logging
 * - Development: Use colors for better readability
 * - Production: No colors (Vercel logs don't support ANSI codes)
 */
function formatAttributes(attributes: LogAttributes): string {
  return inspect(attributes, { depth: null, colors: !isProduction })
}

interface LogAttributes {
  [key: string]: unknown
}

/**
 * Log an informational message
 */
export function logInfo(message: string, attributes?: LogAttributes) {
  if (attributes) {
    console.log(message, formatAttributes(attributes))
  } else {
    console.log(message)
  }

  if (isProduction) {
    if (attributes) {
      Sentry.logger.info(message, attributes)
    } else {
      Sentry.logger.info(message)
    }
  }
}

/**
 * Log a warning message
 */
export function logWarn(message: string, attributes?: LogAttributes) {
  if (attributes) {
    console.warn(message, formatAttributes(attributes))
  } else {
    console.warn(message)
  }

  if (isProduction) {
    if (attributes) {
      Sentry.logger.warn(message, attributes)
    } else {
      Sentry.logger.warn(message)
    }
  }
}

/**
 * Log an error message
 */
export function logError(message: string, error?: unknown, attributes?: LogAttributes) {
  const errorObj = error instanceof Error ? error : undefined
  const combinedAttrs = {
    ...attributes,
    ...(errorObj && { error: errorObj.message, stack: errorObj.stack }),
  }

  // Only pass arguments that are actually provided
  if (attributes) {
    console.error(message, error || "", attributes)
  } else if (error) {
    console.error(message, error)
  } else {
    console.error(message)
  }

  if (isProduction) {
    Sentry.logger.error(message, combinedAttrs)
  }
}

/**
 * Log a debug message
 */
export function logDebug(message: string, attributes?: LogAttributes) {
  if (attributes) {
    console.debug(message, formatAttributes(attributes))
  } else {
    console.debug(message)
  }

  if (isProduction) {
    if (attributes) {
      Sentry.logger.debug(message, attributes)
    } else {
      Sentry.logger.debug(message)
    }
  }
}

/**
 * Log a trace message
 */
export function logTrace(message: string, attributes?: LogAttributes) {
  if (attributes) {
    console.trace(message, formatAttributes(attributes))
  } else {
    console.trace(message)
  }

  if (isProduction) {
    if (attributes) {
      Sentry.logger.trace(message, attributes)
    } else {
      Sentry.logger.trace(message)
    }
  }
}
