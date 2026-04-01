import assert from 'node:assert'
import process from 'node:process'
import { createEndfieldPushMessage, doEndfieldAttendanceForAccount } from './endfield-attendance'

try {
  process.loadEnvFile('.env')
} catch {
  // ignore, dotenv 基本只适用于本地开发
}

assert(typeof process.env.SKLAND_ENDFIELD_TOKEN === 'string', 'SKLAND_ENDFIELD_TOKEN 未设置')

const accounts = process.env.SKLAND_ENDFIELD_TOKEN.split(',')

const [logger, push] = createEndfieldPushMessage({
  withQmsg: process.env.QMSG_SENDKEY,
  qmsgQQ: (process.env.QMSG_ENDFIELD_QQ ? process.env.QMSG_ENDFIELD_QQ.split(',') : undefined),
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
