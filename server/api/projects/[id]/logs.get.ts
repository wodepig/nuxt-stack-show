import { logStorage } from '../../../utils/logStorage'
import { getDeployLogs } from '../../../utils/deployLogCache'
import type { DeployLog } from '../../../types'

const MAX_DETAILS_LENGTH = 2000 // details 字段最大长度（前端显示）
const MAX_LOGS = 30 // 最多返回 30 条日志

// 截断 details 字段，防止返回数据过大
function truncateDetails(log: DeployLog): DeployLog {
  if (log.details && log.details.length > MAX_DETAILS_LENGTH) {
    return {
      ...log,
      details: log.details.substring(0, MAX_DETAILS_LENGTH) + '\n... (内容已截断)'
    }
  }
  return log
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  const query = getQuery(event)
  const since = query.since as string | undefined // 增量获取：只获取此时间之后的日志
  
  // 从内存缓存读取实时日志
  const cachedLogs = getDeployLogs(id)
  
  // 从文件读取持久化日志
  const fileLogs = await logStorage.read()
  const projectFileLogs = fileLogs.filter(log => log.projectId === id)
  
  // 合并日志（根据 ID 去重）
  const logMap = new Map<string, DeployLog>()
  
  // 先添加文件日志
  for (const log of projectFileLogs) {
    logMap.set(log.id, truncateDetails(log))
  }
  
  // 再添加缓存日志（会覆盖文件中的同名日志）
  for (const log of cachedLogs) {
    logMap.set(log.id, truncateDetails(log))
  }
  
  // 转换为数组并排序
  let allLogs = Array.from(logMap.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  
  // 增量获取：只返回指定时间之后的日志
  if (since) {
    const sinceTime = new Date(since).getTime()
    allLogs = allLogs.filter(log => new Date(log.createdAt).getTime() > sinceTime)
  }
  
  // 只返回最新的日志
  const result = allLogs.slice(0, MAX_LOGS)

  return result
})
