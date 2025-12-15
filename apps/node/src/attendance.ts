import process from 'node:process'
import { setTimeout } from 'node:timers/promises'
import { attendance, auth, getBinding, signIn } from '@skland-x/core'
import { bark, messagePusher, serverChan } from '@skland-x/notification'
import { qmsg } from '@skland-x/notification'

export interface Options {
  /** server 酱推送功能的启用，false 或者 server 酱的token */
  withServerChan?: false | string
  /** bark 推送功能的启用，false 或者 bark 的 URL */
  withBark?: false | string
  /** 消息推送功能的启用，false 或者 message-pusher 的 WebHook URL */
  withMessagePusher?: false | string
  /** Qmsg 酱推送功能的启用，false 或者 sendkey */
  withQmsg?: false | string
  /** Qmsg 酱推送目标 QQ 号（可选，支持逗号或数组） */
  qmsgQQ?: string | string[]
}

export function createCombinePushMessage(options: Options) {
  const messages: string[] = []
  let hasError = false
  const logger = (message: string, error?: boolean) => {
    messages.push(message)
    console[error ? 'error' : 'log'](message)
    if (error && !hasError)
      hasError = true
  }
  const push = async () => {
    // console.log('Starting push logic...')
    // console.log('ServerChan configured:', !!options.withServerChan, options.withServerChan ? `(Length: ${options.withServerChan.length})` : '')
    const title = `【森空岛每日签到】`
    const content = messages.join('\n\n')
    if (options.withServerChan) {
      // console.log('Sending ServerChan Message')
      await serverChan(options.withServerChan, title, content)
    }
    if (options.withBark) {
      await bark(options.withBark, title, content)
    }
    if (options.withMessagePusher) {
      await messagePusher(options.withMessagePusher, title, content)
    }
    if (options.withQmsg) {
      await qmsg(options.withQmsg, title, content, options.qmsgQQ)
    }
    // quit with error
    if (hasError)
      process.exit(1)
  }
  const add = (message: string) => {
    messages.push(message)
  }
  return [logger, push, add] as const
}

export async function doAttendanceForAccount(token: string) {
  // console.log('doAttendanceForAccount options:', JSON.stringify(options, null, 2))
  const { code } = await auth(token)
  const { cred, token: signToken } = await signIn(code)
  const { list } = await getBinding(cred, signToken)

  const messages: { message: string, error?: boolean }[] = []
  const logger = (message: string, error?: boolean) => {
    messages.push({ message, error })
    console[error ? 'error' : 'log'](message)
  }

  let successAttendance = 0
  const characterList = list.filter(i => i.appCode === 'arknights').map(i => i.bindingList).flat()
  const maxRetries = Number.parseInt(process.env.MAX_RETRIES || '3', 10) // 添加最大重试次数

  await Promise.all(characterList.map(async (character) => {
    console.log(`将签到角色: ${character.nickName}`)
    let retries = 0 // 初始化重试计数器
    let succeeded = false
    let lastErrorMessage: string | undefined
    while (retries < maxRetries) {
      try {
        const data = await attendance(cred, signToken, {
          uid: character.uid,
          gameId: character.channelMasterId,
        })
        if (data) {
          if (data.code === 0 && data.message === 'OK') {
            const msg = `[${character.nickName}] ${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'} 签到成功${`, 获得了${data.data.awards.map(a => `「${a.resource.name}」${a.count}个`).join(',')}`}`
            logger(msg)
            successAttendance++
            succeeded = true
            break // 签到成功，跳出重试循环
          }
          else {
            const msg = `[${character.nickName}] ${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'} 签到失败${`, 错误消息: ${data.message}\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``}`
            logger(msg, true)
            lastErrorMessage = data.message
            retries++ // 签到失败，增加重试计数器
          }
        }
        else {
          logger(`[${character.nickName}] ${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'} 今天已经签到过了`)
          break // 已经签到过，跳出重试循环
        }
      }
      catch (error: any) {
        if (error.response && error.response.status === 403) {
          logger(`[${character.nickName}] ${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'} 今天已经签到过了`)
          break // 已经签到过，跳出重试循环
        }
        else {
          const isTimeout = typeof error?.message === 'string' && /timeout|Connect Timeout/i.test(error.message)
          const reason = isTimeout ? `网络超时：${error.message}` : `未知错误：${error.message}`
          logger(`[${character.nickName}] 签到过程中出现错误: ${reason}`, true)
          lastErrorMessage = reason
          retries++ // 增加重试计数器
          // 达到最大重试次数时不再中断流程，后续统一记录失败
        }
      }
      // 重试退避延时（1s, 2s, 4s... 上限10s）
      if (!succeeded && retries < maxRetries) {
        const delay = Math.min(10000, 1000 * (2 ** (retries - 1 || 0)))
        await setTimeout(delay)
      }
    }
    // 若用尽重试仍未成功，记录最终失败但不影响后续角色
    if (!succeeded && retries >= maxRetries) {
      logger(`[${character.nickName}] 连续尝试 ${retries} 次仍失败，已跳过。最后错误：${lastErrorMessage ?? '无详细信息'}`, true)
    }
  }))

  return { successCount: successAttendance, messages }
}
