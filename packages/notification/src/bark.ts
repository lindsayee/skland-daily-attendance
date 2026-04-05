import { ofetch } from 'ofetch'

export async function bark(url: string, title: string, content: string): Promise<boolean> {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    console.error('Wrong type for Bark URL.')
    return false
  }

  const payload = {
    title,
    body: content,
    group: 'Skland',
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
    console.error(`[Bark] Error: ${error}`)
    return false
  }
}
