import { readFile, writeFile, access, mkdir, readdir, stat, unlink } from 'fs/promises'
import { join } from 'path'
import type { DeployLog } from '../types'

const DATA_DIR = join(process.cwd(), 'server', 'data')
const LOGS_DIR = join(DATA_DIR, 'logs')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_LOG_FILES = 10 // 最多保留10个日志文件

// 文件锁
const fileLocks = new Map<string, Promise<void>>()

async function ensureLogsDir() {
  try {
    await access(LOGS_DIR)
  } catch {
    await mkdir(LOGS_DIR, { recursive: true })
  }
}

async function withLock<T>(filepath: string, operation: () => Promise<T>): Promise<T> {
  while (fileLocks.has(filepath)) {
    await fileLocks.get(filepath)
  }

  let resolveLock: () => void
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve
  })
  fileLocks.set(filepath, lockPromise)

  try {
    return await operation()
  } finally {
    fileLocks.delete(filepath)
    resolveLock!()
  }
}

// 获取当前日志文件路径
async function getCurrentLogFile(): Promise<string> {
  await ensureLogsDir()
  
  const files = await readdir(LOGS_DIR).catch(() => [] as string[])
  const logFiles = files
    .filter(f => f.startsWith('deploy-logs-') && f.endsWith('.json'))
    .sort()
  
  if (logFiles.length === 0) {
    return join(LOGS_DIR, 'deploy-logs-001.json')
  }
  
  // 检查最新的文件大小
  const latestFile = logFiles[logFiles.length - 1]!
  const latestPath = join(LOGS_DIR, latestFile)
  
  try {
    const fileStat = await stat(latestPath)
    if (fileStat.size < MAX_FILE_SIZE) {
      return latestPath
    }
  } catch {
    // 文件不存在，创建新的
  }
  
  // 创建新文件
  const nextNumber = logFiles.length + 1
  const nextFile = `deploy-logs-${String(nextNumber).padStart(3, '0')}.json`
  return join(LOGS_DIR, nextFile)
}

// 清理旧日志文件
async function cleanupOldLogs(): Promise<void> {
  const files = await readdir(LOGS_DIR).catch(() => [] as string[])
  const logFiles = files
    .filter(f => f.startsWith('deploy-logs-') && f.endsWith('.json'))
    .sort()
  
  if (logFiles.length > MAX_LOG_FILES) {
    const filesToDelete = logFiles.slice(0, logFiles.length - MAX_LOG_FILES)
    for (const file of filesToDelete) {
      try {
        await unlink(join(LOGS_DIR, file))
        console.log(`[LogStorage] Deleted old log file: ${file}`)
      } catch (e) {
        console.error(`[LogStorage] Failed to delete ${file}:`, e)
      }
    }
  }
}

export const logStorage = {
  async read(): Promise<DeployLog[]> {
    await ensureLogsDir()
    
    const files = await readdir(LOGS_DIR).catch(() => [] as string[])
    const logFiles = files
      .filter(f => f.startsWith('deploy-logs-') && f.endsWith('.json'))
      .sort()
    
    const allLogs: DeployLog[] = []
    
    for (const file of logFiles) {
      try {
        const data = await readFile(join(LOGS_DIR, file), 'utf-8')
        const logs = JSON.parse(data)
        if (Array.isArray(logs)) {
          allLogs.push(...logs)
        }
      } catch {
        // 忽略损坏的文件
      }
    }
    
    return allLogs
  },

  async add(item: DeployLog): Promise<void> {
    const filepath = await getCurrentLogFile()
    
    await withLock(filepath, async () => {
      let data: DeployLog[] = []
      try {
        const content = await readFile(filepath, 'utf-8')
        data = JSON.parse(content)
      } catch {
        // 文件不存在或损坏，使用空数组
      }
      
      data.push(item)
      await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8')
      
      // 检查是否需要清理旧日志
      await cleanupOldLogs()
    })
  },

  async clear(): Promise<{ deletedCount: number; deletedSize: number }> {
    await ensureLogsDir()
    
    const files = await readdir(LOGS_DIR).catch(() => [] as string[])
    const logFiles = files.filter(f => f.startsWith('deploy-logs-') && f.endsWith('.json'))
    
    let deletedCount = 0
    let deletedSize = 0
    
    for (const file of logFiles) {
      const filepath = join(LOGS_DIR, file)
      try {
        const fileStat = await stat(filepath)
        deletedSize += fileStat.size
        await unlink(filepath)
        deletedCount++
      } catch (e) {
        console.error(`[LogStorage] Failed to delete ${file}:`, e)
      }
    }
    
    return { deletedCount, deletedSize }
  },

  async getStats(): Promise<{ fileCount: number; totalSize: number; totalSizeFormatted: string }> {
    await ensureLogsDir()
    
    const files = await readdir(LOGS_DIR).catch(() => [] as string[])
    const logFiles = files.filter(f => f.startsWith('deploy-logs-') && f.endsWith('.json'))
    
    let totalSize = 0
    for (const file of logFiles) {
      try {
        const fileStat = await stat(join(LOGS_DIR, file))
        totalSize += fileStat.size
      } catch {
        // 忽略
      }
    }
    
    return {
      fileCount: logFiles.length,
      totalSize,
      totalSizeFormatted: formatSize(totalSize)
    }
  }
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`
}
