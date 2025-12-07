import assert from 'node:assert'
import process from 'node:process'
import { createCombinePushMessage, doAttendanceForAccount } from './attendance'

try {
  process.loadEnvFile('.env')
} catch {
  // ignore, dotenv 基本只适用于本地开发
}

assert(typeof process.env.SKLAND_TOKEN === 'string', 'SKLAND_TOKEN 未设置')

const accounts = process.env.SKLAND_TOKEN.split(',')

const [logger, push] = createCombinePushMessage({
  withServerChan: process.env.SERVER_CHAN_TOKEN || process.env.SERVERCHAN_SENDKEY,
  withBark: process.env.BARK_URL,
  withMessagePusher: process.env.MESSAGE_PUSHER_URL,
  withQmsg: process.env.QMSG_SENDKEY,
})

logger('## 明日方舟签到')

let totalSuccess = 0
await Promise.all(accounts.map(async (token, index) => {
  console.log(`开始处理第 ${index + 1}/${accounts.length} 个账号`)
  const { successCount, messages } = await doAttendanceForAccount(token)
  totalSuccess += successCount
  messages.forEach(({ message, error }) => logger(message, error))
}))

if (totalSuccess !== 0)
  logger(`本次共成功签到 ${totalSuccess} 个角色`)

await push()
