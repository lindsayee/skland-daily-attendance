import { ofetch } from 'ofetch'

// Qmsg酱: https://qmsg.zendee.cn/
// 发送接口: POST https://qmsg.zendee.cn/send/{key}
// 参数: msg=内容
export async function qmsg(sendkey: string, title: string, content: string, qq?: string | string[]) {
  if (typeof sendkey !== 'string' || sendkey.trim() === '') {
    console.error('Wrong type for Qmsg sendkey.')
    return
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
    const data = await ofetch<{ success: boolean; reason?: string }>(
      `https://qmsg.zendee.cn/send/${sendkey}`,
      {
        method: 'POST',
        body: payload,
      },
    )
    if ((data as any).success) {
      console.log('[Qmsg] Send message successfully.')
    } else {
      console.log(`[Qmsg][Send Message Response] ${JSON.stringify(data)}`)
    }
  }
  catch (error) {
    console.error(`[Qmsg] Error: ${error}`)
  }
}
