import { stat, writeFile } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'server', 'data')
const LOGS_FILE = join(DATA_DIR, 'deploy-logs.json')

export default defineEventHandler(async () => {
  try {
    // 获取日志文件大小
    let fileSize = 0
    try {
      const fileStat = await stat(LOGS_FILE)
      fileSize = fileStat.size
    } catch {
      // 文件不存在
      return {
        success: true,
        cleanedCount: 0,
        cleanedSize: 0,
        cleanedSizeFormatted: '0 B',
        message: '日志文件不存在'
      }
    }

    // 清空日志文件（保留空数组）
    await writeFile(LOGS_FILE, '[]', 'utf-8')

    return {
      success: true,
      cleanedCount: 1,
      cleanedSize: fileSize,
      cleanedSizeFormatted: formatSize(fileSize),
      message: '日志已清空'
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Cleanup failed'
    })
  }
})

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
