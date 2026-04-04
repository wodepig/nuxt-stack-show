import type { DeployLog } from '../types'

// 部署日志缓存 - 用于实时推送日志到前端
const deployLogCache = new Map<string, DeployLog[]>()
const MAX_CACHE_SIZE = 100 // 每个项目最多缓存 100 条日志
const MAX_DETAILS_LENGTH = 5000 // details 字段最大长度

// 截断 details 字段，防止内存占用过大
function truncateDetails(log: DeployLog): DeployLog {
  if (log.details && log.details.length > MAX_DETAILS_LENGTH) {
    return {
      ...log,
      details: log.details.substring(0, MAX_DETAILS_LENGTH) + '\n... (内容已截断)'
    }
  }
  return log
}

export function getDeployLogs(projectId: string): DeployLog[] {
  return deployLogCache.get(projectId) || []
}

export function addDeployLog(projectId: string, log: DeployLog): void {
  let logs = deployLogCache.get(projectId)
  if (!logs) {
    logs = []
    deployLogCache.set(projectId, logs)
  }
  
  // 截断 details 后再添加到缓存
  logs.push(truncateDetails(log))
  
  // 限制缓存大小
  if (logs.length > MAX_CACHE_SIZE) {
    logs.shift() // 移除最旧的日志
  }
}

export function clearDeployLogs(projectId: string): void {
  deployLogCache.delete(projectId)
}

export function getAllDeployLogs(projectId: string): DeployLog[] {
  return deployLogCache.get(projectId) || []
}
