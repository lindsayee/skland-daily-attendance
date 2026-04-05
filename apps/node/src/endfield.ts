import assert from 'node:assert'
import process from 'node:process'
import { doEndfieldAttendanceForAccount } from './endfield-attendance'
import { createPushMessage, loadEmailConfig } from './push'

try {
  process.loadEnvFile('.env')
} catch {
  // ignore, dotenv 基本只适用于本地开发
}

assert(typeof process.env.SKLAND_ENDFIELD_TOKEN === 'string', 'SKLAND_ENDFIELD_TOKEN 未设置')

const accounts = process.env.SKLAND_ENDFIELD_TOKEN.split(',')

const [logger, push] = createPushMessage('【终末地每日签到】', {
  withServerChan: process.env.ENDFIELD_SERVERCHAN_SENDKEY || process.env.SERVERCHAN_SENDKEY,
  withBark: process.env.ENDFIELD_BARK_URL || process.env.BARK_URL,
  withMessagePusher: process.env.ENDFIELD_MESSAGE_PUSHER_URL || process.env.MESSAGE_PUSHER_URL,
  withQmsg: process.env.ENDFIELD_QMSG_SENDKEY || process.env.QMSG_SENDKEY,
  qmsgQQ: (process.env.QMSG_ENDFIELD_QQ ? process.env.QMSG_ENDFIELD_QQ.split(',') : undefined),
  withEmail: loadEmailConfig(),
})

logger('## 终末地签到')

let totalSuccess = 0
await Promise.all(accounts.map(async (token, index) => {
  console.log(`开始处理第 ${index + 1}/${accounts.length} 个账号`)
  const { successCount, messages } = await doEndfieldAttendanceForAccount(token)
  totalSuccess += successCount
  messages.forEach(({ message, error }) => logger(message, error))
}))

if (totalSuccess !== 0)
  logger(`本次共成功签到 ${totalSuccess} 个角色`)

await push()
