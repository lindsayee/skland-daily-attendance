import { setTimeout } from 'node:timers/promises'

export function parseIntOrDefault(value: string | undefined, defaultValue: number): number {
  if (typeof value !== 'string')
    return defaultValue
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? defaultValue : parsed
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = parseIntOrDefault(process.env.MAX_RETRIES, 3),
  initialDelay = 1000,
  shouldRetry?: (error: unknown) => boolean,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    }
    catch (error) {
      lastError = error
      if (shouldRetry && !shouldRetry(error))
        throw error
      if (attempt === retries)
        break
      const delay = Math.min(10000, initialDelay * 2 ** (attempt - 1))
      await setTimeout(delay)
    }
  }

  throw lastError
}
