import { ofetch } from 'ofetch'

export async function messagePusher(url: string, title: string, content: string): Promise<boolean> {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    console.error('Wrong type for MessagePusher URL.')
    return false
  }

  const payload = {
    title,
    content,
    description: content,
  }
  try {
    const data = await ofetch(
      url,
      {
        method: 'POST',
        body: payload,
      },
    )
    console.debug(data)
    return true
  }
  catch (error) {
    console.error(`[MessagePusher] Error: ${error}`)
    return false
  }
}
