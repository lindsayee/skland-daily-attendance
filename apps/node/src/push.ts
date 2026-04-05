import process from 'node:process'
import { bark, messagePusher, serverChan } from '@skland-x/notification'
import { qmsg } from '@skland-x/notification'
import { sendEmail } from './email'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  to: string
}

export interface PushOptions {
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
  /** 邮件回退配置，当所有推送渠道都失败时用于发送邮件 */
  withEmail?: false | EmailConfig
}

/**
 * 创建统一的推送消息聚合器
 * @param title 推送标题
 * @param options 推送渠道配置
 */
export function createPushMessage(title: string, options: PushOptions) {
  const messages: string[] = []
  let hasError = false

  const logger = (message: string, error?: boolean) => {
    messages.push(message)
    console[error ? 'error' : 'log'](message)
    if (error && !hasError)
      hasError = true
  }

  const push = async () => {
    const content = messages.join('\n\n')

    // 收集所有已配置的推送任务，并行独立执行
    const dispatchers: { name: string, task: Promise<boolean> }[] = []
    if (options.withServerChan) {
      dispatchers.push({ name: 'ServerChan', task: serverChan(options.withServerChan, title, content) })
    }
    if (options.withBark) {
      dispatchers.push({ name: 'Bark', task: bark(options.withBark, title, content) })
    }
    if (options.withMessagePusher) {
      dispatchers.push({ name: 'MessagePusher', task: messagePusher(options.withMessagePusher, title, content) })
    }
    if (options.withQmsg) {
      dispatchers.push({ name: 'Qmsg', task: qmsg(options.withQmsg, title, content, options.qmsgQQ) })
    }

    if (dispatchers.length > 0) {
      // 并行执行所有推送，互不阻断
      const results = await Promise.allSettled(dispatchers.map(d => d.task))

      const allFailed = results.every(r =>
        r.status === 'rejected' || (r.status === 'fulfilled' && !r.value),
      )

      // 打印每个渠道的推送结果
      results.forEach((r, i) => {
        const name = dispatchers[i].name
        if (r.status === 'rejected') {
          console.error(`[${name}] 推送异常: ${r.reason}`)
        }
        else if (!r.value) {
          console.error(`[${name}] 推送失败`)
        }
      })

      // 所有渠道都失败时，尝试邮件回退
      if (allFailed && options.withEmail) {
        console.log('所有推送渠道均失败，尝试通过邮件发送通知...')
        await sendEmail(options.withEmail, title, content)
      }
    }

    // quit with error
    if (hasError)
      process.exit(1)
  }

  return [logger, push] as const
}

/**
 * 从环境变量中读取邮件回退配置
 */
export function loadEmailConfig(): false | EmailConfig {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_TO) {
    return {
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE !== 'false',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      to: process.env.EMAIL_TO,
    }
  }
  return false
}

/**
 * 创建账号级别的消息收集器
 */
export function createAccountLogger() {
  const messages: { message: string, error?: boolean }[] = []
  let successCount = 0

  const logger = (message: string, error?: boolean) => {
    messages.push({ message, error })
    console[error ? 'error' : 'log'](message)
  }

  const addSuccess = () => { successCount++ }

  return { messages, logger, addSuccess, getSuccessCount: () => successCount }
}
