import { logStorage } from '../../utils/logStorage'

export default defineEventHandler(async () => {
  try {
    // 获取清理前的统计
    const statsBefore = await logStorage.getStats()
    
    // 完全删除所有日志文件
    const { deletedCount, deletedSize } = await logStorage.clear()
    
    return {
      success: true,
      deletedCount,
      deletedSize,
      deletedSizeFormatted: formatSize(deletedSize),
      message: `已完全删除 ${deletedCount} 个日志文件，释放 ${formatSize(deletedSize)} 空间`
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
