import { ofetch } from 'ofetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { qmsg } from './qmsg'

vi.mock('ofetch', () => ({
  ofetch: vi.fn(),
}))

const mockedOfetch = vi.mocked(ofetch)

describe('qmsg', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockedOfetch.mockReset()
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it('logs non-2xx response details without leaking secrets', async () => {
    const fakeSendkey = 'sample-sendkey-value'
    const fakeToken = 'sample-token-value'

    mockedOfetch.mockRejectedValueOnce({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 10001,
        message: `invalid sendkey ${fakeSendkey}`,
        token: fakeToken,
        nested: {
          sendkey: fakeSendkey,
        },
      },
    })

    const result = await qmsg(fakeSendkey, 'title', 'content')
    const output = consoleError.mock.calls.map(call => call.join(' ')).join('\n')

    expect(result).toBe(false)
    expect(output).toContain('[Qmsg][HTTP Status] 400 Bad Request')
    expect(output).toContain('[Qmsg][Error Code] 10001')
    expect(output).toContain('[Qmsg][Error Message] invalid sendkey [REDACTED]')
    expect(output).toContain('"token":"[REDACTED]"')
    expect(output).toContain('"sendkey":"[REDACTED]"')
    expect(output).not.toContain(fakeSendkey)
    expect(output).not.toContain(fakeToken)
  })
})
