export interface CleanupStats {
  projectsSize: number
  projectsSizeFormatted: string
  logsSize: number
  logsSizeFormatted: string
  orphanCount: number
  orphanSize: number
  orphanSizeFormatted: string
  totalSize: number
  totalSizeFormatted: string
}

export interface CleanupResult {
  success: boolean
  cleanedCount: number
  cleanedSize: number
  cleanedSizeFormatted: string
  cleanedItems?: string[]
  message?: string
}

export function useCleanup() {
  const stats = ref<CleanupStats | null>(null)
  const loading = ref(false)

  async function fetchStats() {
    try {
      const data = await $fetch<CleanupStats>('/api/cleanup/stats')
      stats.value = data
      return data
    } catch (e) {
      console.error('Failed to fetch cleanup stats:', e)
      throw e
    }
  }

  async function cleanupProjects(): Promise<CleanupResult> {
    try {
      const result = await $fetch<CleanupResult>('/api/cleanup/projects', {
        method: 'POST'
      })
      await fetchStats()
      return result
    } catch (e) {
      console.error('Failed to cleanup projects:', e)
      throw e
    }
  }

  async function cleanupLogs(): Promise<CleanupResult> {
    try {
      const result = await $fetch<CleanupResult>('/api/cleanup/logs', {
        method: 'POST'
      })
      await fetchStats()
      return result
    } catch (e) {
      console.error('Failed to cleanup logs:', e)
      throw e
    }
  }

  return {
    stats,
    loading,
    fetchStats,
    cleanupProjects,
    cleanupLogs
  }
}
