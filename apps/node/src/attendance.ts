import process from 'node:process'
import { setTimeout } from 'node:timers/promises'
import { attendance, auth, getBinding, signIn } from '@skland-x/core'
import { createAccountLogger } from './push'

export async function doAttendanceForAccount(token: string) {
  const { code } = await auth(token)
  const { cred, token: signToken } = await signIn(code)
  const { list } = await getBinding(cred, signToken)

  const { messages, logger, addSuccess, getSuccessCount } = createAccountLogger()

  const characterList = list.filter(i => i.appCode === 'arknights').map(i => i.bindingList).flat()
  const maxRetries = Number.parseInt(process.env.MAX_RETRIES || '3', 10)

  await Promise.all(characterList.map(async (character) => {
    console.log(`将签到角色: ${character.nickName}`)
    let retries = 0
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
            addSuccess()
            succeeded = true
            break
          }
          else {
            const msg = `[${character.nickName}] ${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'} 签到失败${`, 错误消息: ${data.message}\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``}`
            logger(msg, true)
            lastErrorMessage = data.message
            retries++
          }
        }
        else {
          logger(`[${character.nickName}] ${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'} 今天已经签到过了`)
          break
        }
      }
      catch (error: any) {
        if (error.response && error.response.status === 403) {
          logger(`[${character.nickName}] ${(Number(character.channelMasterId) - 1) ? 'B 服' : '官服'} 今天已经签到过了`)
          break
        }
        else {
          const isTimeout = typeof error?.message === 'string' && /timeout|Connect Timeout/i.test(error.message)
          const reason = isTimeout ? `网络超时：${error.message}` : `未知错误：${error.message}`
          logger(`[${character.nickName}] 签到过程中出现错误: ${reason}`, true)
          lastErrorMessage = reason
          retries++
        }
      }
      if (!succeeded && retries < maxRetries) {
        const delay = Math.min(10000, 1000 * (2 ** (retries - 1 || 0)))
        await setTimeout(delay)
      }
    }
    if (!succeeded && retries >= maxRetries) {
      logger(`[${character.nickName}] 连续尝试 ${retries} 次仍失败，已跳过。最后错误：${lastErrorMessage ?? '无详细信息'}`, true)
    }
  }))

  return { successCount: getSuccessCount(), messages }
}
