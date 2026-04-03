import { readdir, stat, rm } from 'fs/promises'
import { join } from 'path'
import { createStorage } from '../../utils/storage'
import type { Project } from '../../types'

const projectStorage = createStorage<Project>('projects.json')
const PROJECTS_DIR = join(process.cwd(), 'projects')

export default defineEventHandler(async () => {
  try {
    // 获取所有项目ID
    const projects = await projectStorage.read()
    const projectIds = new Set(projects.map(p => p.id))

    // 读取 projects 目录
    const entries = await readdir(PROJECTS_DIR)
    let cleanedSize = 0
    let cleanedCount = 0
    const cleanedItems: string[] = []

    for (const entry of entries) {
      // 跳过 .gitkeep
      if (entry === '.gitkeep') continue

      // 如果不是项目ID，则删除
      if (!projectIds.has(entry)) {
        const itemPath = join(PROJECTS_DIR, entry)
        const itemStat = await stat(itemPath)
        
        // 计算大小
        const size = await getDirectorySize(itemPath)
        cleanedSize += size
        cleanedCount++
        cleanedItems.push(entry)

        // 删除目录
        await rm(itemPath, { recursive: true, force: true })
      }
    }

    return {
      success: true,
      cleanedCount,
      cleanedSize,
      cleanedSizeFormatted: formatSize(cleanedSize),
      cleanedItems
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Cleanup failed'
    })
  }
})

async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0
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
  
  return size
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
