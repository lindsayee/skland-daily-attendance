import process from 'node:process'
import { setTimeout } from 'node:timers/promises'
import type { BindingRole } from '@skland-x/core'
import { auth, endfieldAttendance, getBinding, signIn } from '@skland-x/core'
import { createAccountLogger } from './push'

export async function doEndfieldAttendanceForAccount(token: string) {
  const { code } = await auth(token)
  const { cred, token: signToken } = await signIn(code)
  const { list } = await getBinding(cred, signToken)

  const { messages, logger, addSuccess, getSuccessCount } = createAccountLogger()

  const endfieldBindings = list.filter(i => i.appCode === 'endfield')

  if (endfieldBindings.length === 0) {
    logger('未找到终末地绑定角色', true)
    return { successCount: 0, messages }
  }

  const maxRetries = Number.parseInt(process.env.MAX_RETRIES || '3', 10)

  const allRoles: { role: BindingRole, nickName: string }[] = []
  for (const binding of endfieldBindings) {
    for (const item of binding.bindingList) {
      if (item.roles && item.roles.length > 0) {
        for (const role of item.roles) {
          allRoles.push({ role, nickName: role.nickname || item.nickName })
        }
      }
    }
  }

  if (allRoles.length === 0) {
    logger('终末地没有可签到的角色', true)
    return { successCount: 0, messages }
  }

  await Promise.all(allRoles.map(async ({ role, nickName }) => {
    console.log(`将签到终末地角色: ${nickName}`)
    let retries = 0
    let succeeded = false
    let lastErrorMessage: string | undefined
    while (retries < maxRetries) {
      try {
        const data = await endfieldAttendance(cred, signToken, role.roleId, role.serverId)
        if (data.code === 0 && data.message === 'OK') {
          const awardIds = data.data.awardIds || []
          const resourceMap = data.data.resourceInfoMap || {}
          const awardTexts = awardIds.map((a) => {
            const info = resourceMap[a.id]
            if (info)
              return `「${info.name}」${a.count ?? info.count ?? 1}个`
            return `「${a.id}」`
          })
          const msg = `[${nickName}] 终末地签到成功${awardTexts.length > 0 ? `, 获得了${awardTexts.join(',')}` : ''}`
          logger(msg)
          addSuccess()
          succeeded = true
          break
        }
        else {
          const msg = `[${nickName}] 终末地签到失败, 错误消息: ${data.message}`
          logger(msg, true)
          lastErrorMessage = data.message
          retries++
        }
      }
      catch (error: any) {
        if (error.response && error.response.status === 403) {
          logger(`[${nickName}] 终末地今天已经签到过了`)
          break
        }
        else {
          const isTimeout = typeof error?.message === 'string' && /timeout|Connect Timeout/i.test(error.message)
          const reason = isTimeout ? `网络超时：${error.message}` : `未知错误：${error.message}`
          logger(`[${nickName}] 终末地签到过程中出现错误: ${reason}`, true)
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
      logger(`[${nickName}] 终末地连续尝试 ${retries} 次仍失败，已跳过。最后错误：${lastErrorMessage ?? '无详细信息'}`, true)
    }
  }))

  return { successCount: getSuccessCount(), messages }
}
