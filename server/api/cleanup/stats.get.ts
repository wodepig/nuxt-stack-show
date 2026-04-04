import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { createStorage } from '../../utils/storage'
import { logStorage } from '../../utils/logStorage'
import type { Project } from '../../types'

const projectStorage = createStorage<Project>('projects.json')
const PROJECTS_DIR = join(process.cwd(), 'projects')

export default defineEventHandler(async () => {
  try {
    // 获取项目目录大小
    const projectsSize = await getDirectorySize(PROJECTS_DIR)
    
    // 获取日志文件统计（支持多文件）
    const logsStats = await logStorage.getStats()

    // 统计孤儿目录（没有关联项目的目录）
    const projects = await projectStorage.read()
    const projectIds = new Set(projects.map(p => p.id))
    
    let orphanSize = 0
    let orphanCount = 0
    
    try {
      const entries = await readdir(PROJECTS_DIR)
      for (const entry of entries) {
        if (entry === '.gitkeep') continue
        if (!projectIds.has(entry)) {
          const entryPath = join(PROJECTS_DIR, entry)
          orphanSize += await getDirectorySize(entryPath)
          orphanCount++
        }
      }
    } catch {
      // 目录不存在
    }

    return {
      projectsSize,
      projectsSizeFormatted: formatSize(projectsSize),
      logsSize: logsStats.totalSize,
      logsSizeFormatted: logsStats.totalSizeFormatted,
      logsFileCount: logsStats.fileCount,
      orphanCount,
      orphanSize,
      orphanSizeFormatted: formatSize(orphanSize),
      totalSize: projectsSize + logsStats.totalSize,
      totalSizeFormatted: formatSize(projectsSize + logsStats.totalSize)
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Get stats failed'
    })
  }
})

async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      if (entry.isDirectory()) {
        size += await getDirectorySize(fullPath)
      } else {
        const fileStat = await stat(fullPath)
        size += fileStat.size
      }
    }
  } catch {
    // 目录不存在或无法访问
  }
  
  return size
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`
}
