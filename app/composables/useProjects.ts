import type { Project, DeployStep } from '../../shared/types/project'

export function useProjects() {
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProjects() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<Project[]>('/api/projects')
      projects.value = data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch projects'
    } finally {
      loading.value = false
    }
  }

  async function getProject(id: string) {
    try {
      return await $fetch<Project>(`/api/projects/${id}`)
    } catch (e) {
      throw e
    }
  }

  async function createProject(data: {
    name: string
    description?: string
    gitUrl: string
    branch?: string
    domain: string
    port: number
    steps: DeployStep[]
  }) {
    try {
      const project = await $fetch<Project>('/api/projects', {
        method: 'POST',
        body: data
      })
      await fetchProjects()
      return project
    } catch (e) {
      throw e
    }
  }

  async function updateProject(id: string, data: Partial<Project>) {
    try {
      const project = await $fetch<Project>(`/api/projects/${id}`, {
        method: 'PUT',
        body: data
      })
      await fetchProjects()
      return project
    } catch (e) {
      throw e
    }
  }

  async function deleteProject(id: string) {
    try {
      await $fetch(`/api/projects/${id}`, {
        method: 'DELETE' as any
      })
      await fetchProjects()
    } catch (e) {
      throw e
    }
  }

  return {
    projects,
    loading,
    error,
    fetchProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject
  }
}
