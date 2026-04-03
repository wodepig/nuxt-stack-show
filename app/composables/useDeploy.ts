import type { DeployLog } from '../../shared/types/project'

export function useDeploy() {
  const deploying = ref(false)
  const logs = ref<DeployLog[]>([])
  const error = ref<string | null>(null)

  async function deployProject(id: string) {
    deploying.value = true
    error.value = null
    try {
      const result = await $fetch<{
        success: boolean
        message: string
        url: string
        pid?: number
      }>(`/api/projects/${id}/deploy`, {
        method: 'POST'
      })
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Deployment failed'
      throw e
    } finally {
      deploying.value = false
    }
  }

  async function stopProject(id: string) {
    try {
      const result = await $fetch<{
        success: boolean
        message: string
      }>(`/api/projects/${id}/stop`, {
        method: 'POST'
      })
      return result
    } catch (e) {
      throw e
    }
  }

  async function fetchLogs(id: string, limit = 50) {
    try {
      const data = await $fetch<DeployLog[]>(`/api/projects/${id}/logs`, {
        query: { limit }
      })
      logs.value = data
      return data
    } catch (e) {
      throw e
    }
  }

  return {
    deploying,
    logs,
    error,
    deployProject,
    stopProject,
    fetchLogs
  }
}
