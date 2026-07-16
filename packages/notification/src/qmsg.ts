import type { IFetchError } from 'ofetch'
import { ofetch } from 'ofetch'

// Qmsg酱: https://qmsg.zendee.cn/
// 发送接口: POST https://qmsg.zendee.cn/send/{key}
// 参数: msg=内容
interface QmsgResponse {
  success?: boolean
  code?: number | string
  errcode?: number | string
  errno?: number | string
  error_code?: number | string
  msg?: string
  message?: string
  errmsg?: string
  error?: string
  reason?: string
}

const REDACTED = '[REDACTED]'
const ERROR_CODE_KEYS = new Set(['code', 'errcode', 'errno', 'errorcode'])
const ERROR_MESSAGE_KEYS = new Set(['msg', 'message', 'errmsg', 'error', 'reason', 'errormessage', 'errordescription'])
const SENSITIVE_KEY_PATTERN = /sendkey|token|secret|authorization|password|passwd|pass|cookie|session|access[_-]?token|refresh[_-]?token|key/i

export async function qmsg(sendkey: string, title: string, content: string, qq?: string | string[]): Promise<boolean> {
  if (typeof sendkey !== 'string' || sendkey.trim() === '') {
    console.error('Wrong type for Qmsg sendkey.')
    return false
  }
  const payload: Record<string, string> = {
    msg: `${title}\n\n${content}`,
  }
  if (Array.isArray(qq)) {
    const list = qq.map(q => q.trim()).filter(Boolean)
    if (list.length > 0)
      payload.qq = list.join(',')
  }
  else if (typeof qq === 'string' && qq.trim() !== '') {
    payload.qq = qq.trim()
  }
  try {
    const form = new URLSearchParams(payload)
    const data = await ofetch<QmsgResponse>(
      `https://qmsg.zendee.cn/send/${sendkey}`,
      {
        method: 'POST',
        body: form,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )
    if (data.success) {
      console.log('[Qmsg] Send message successfully.')
      return true
    }
    else {
      logQmsgFailure(data, sendkey)
      return false
    }
  }
  catch (error) {
    logQmsgError(error, sendkey)
    return false
  }
}

function logQmsgFailure(data: QmsgResponse, sendkey: string) {
  const lines = [
    '[Qmsg] Send message failed.',
    ...formatQmsgErrorDetails(data, { sendkey }),
  ]

  console.error(lines.join('\n'))
}

function logQmsgError(error: unknown, sendkey: string) {
  const fetchError = error as IFetchError<unknown>
  const statusCode = fetchError.statusCode ?? fetchError.status ?? fetchError.response?.status
  const statusMessage = fetchError.statusMessage ?? fetchError.statusText ?? fetchError.response?.statusText
  const responseBody = fetchError.data ?? fetchError.response?._data
  const lines = ['[Qmsg] Request failed.']

  if (statusCode !== undefined || statusMessage) {
    const safeStatusMessage = statusMessage ? redactSensitiveText(statusMessage, [sendkey]) : ''
    lines.push(`[Qmsg][HTTP Status] ${statusCode ?? 'unknown'}${safeStatusMessage ? ` ${safeStatusMessage}` : ''}`)
  }

  if (responseBody !== undefined) {
    lines.push(...formatQmsgErrorDetails(responseBody, { sendkey }))
  }
  else {
    const fallbackMessage = error instanceof Error ? error.message : String(error)
    lines.push(`[Qmsg][Error Message] ${stringifyForLog(sanitizeForLog(fallbackMessage, [sendkey]))}`)
  }

  console.error(lines.join('\n'))
}

function formatQmsgErrorDetails(responseBody: unknown, options: { sendkey: string }) {
  const secrets = [options.sendkey]
  const lines: string[] = []
  const errorCode = findFieldValue(responseBody, ERROR_CODE_KEYS)
  const errorMessage = findFieldValue(responseBody, ERROR_MESSAGE_KEYS)

  if (errorCode !== undefined)
    lines.push(`[Qmsg][Error Code] ${stringifyForLog(sanitizeForLog(errorCode, secrets))}`)

  if (errorMessage !== undefined)
    lines.push(`[Qmsg][Error Message] ${stringifyForLog(sanitizeForLog(errorMessage, secrets))}`)

  lines.push(`[Qmsg][Response Body] ${stringifyForLog(sanitizeForLog(responseBody, secrets))}`)

  return lines
}

function findFieldValue(value: unknown, keys: Set<string>, seen = new WeakSet<object>(), depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object')
    return undefined

  if (seen.has(value))
    return undefined
  seen.add(value)

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFieldValue(item, keys, seen, depth + 1)
      if (found !== undefined)
        return found
    }
    return undefined
  }

  for (const [key, fieldValue] of Object.entries(value)) {
    if (keys.has(normalizeKey(key)) && isScalarValue(fieldValue))
      return fieldValue
  }

  for (const fieldValue of Object.values(value)) {
    const found = findFieldValue(fieldValue, keys, seen, depth + 1)
    if (found !== undefined)
      return found
  }

  return undefined
}

function sanitizeForLog(value: unknown, secrets: string[], seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string')
    return redactSensitiveText(value, secrets)

  if (value === null || typeof value !== 'object')
    return value

  if (seen.has(value))
    return '[Circular]'
  seen.add(value)

  if (Array.isArray(value))
    return value.map(item => sanitizeForLog(item, secrets, seen))

  const sanitized: Record<string, unknown> = {}
  for (const [key, fieldValue] of Object.entries(value)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? REDACTED
      : sanitizeForLog(fieldValue, secrets, seen)
  }

  return sanitized
}

function redactSensitiveText(text: string, secrets: string[]) {
  let result = text

  for (const secret of secrets.map(secret => secret.trim()).filter(Boolean))
    result = result.split(secret).join(REDACTED)

  return result
    .replace(/(https?:\/\/qmsg\.zendee\.cn\/send\/)[^/?#\s"']+/gi, `$1${REDACTED}`)
    .replace(/\b(sendkey|token|secret|authorization|password|passwd|pass|cookie|access[_-]?token|refresh[_-]?token|key)=([^&\s"']+)/gi, `$1=${REDACTED}`)
    .replace(/(["'])(sendkey|token|secret|authorization|password|passwd|pass|cookie|access[_-]?token|refresh[_-]?token|key)\1\s*:\s*(["']).*?\3/gi, `$1$2$1:$3${REDACTED}$3`)
}

function stringifyForLog(value: unknown) {
  if (typeof value === 'string')
    return value

  if (value === undefined)
    return 'undefined'

  try {
    return JSON.stringify(value) ?? String(value)
  }
  catch {
    return String(value)
  }
}

function normalizeKey(key: string) {
  return key.replace(/[-_]/g, '').toLowerCase()
}

function isScalarValue(value: unknown) {
  return ['string', 'number', 'boolean'].includes(typeof value)
}
