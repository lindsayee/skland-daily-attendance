import { ofetch } from 'ofetch'

export async function serverChan(sendkey: string, title: string, content: string): Promise<boolean> {
  if (typeof sendkey !== 'string') {
    console.error('Wrong type for serverChan token.')
    return false
  }
  const payload = {
    title,
    desp: content,
  }
  try {
    const data = await ofetch<{ code: number }>(
      `https://sctapi.ftqq.com/${sendkey}.send`,
      {
        method: 'POST',
        body: payload,
      },
    )
    if (data.code === 0) {
      console.log('[ServerChan] Send message to ServerChan successfully.')
      return true
    }
    else {
      console.log(`[ServerChan][Send Message Response] ${data}`)
      return false
    }
  }
  catch (error) {
    console.error(`[ServerChan] Error: ${error}`)
    return false
  }
}
