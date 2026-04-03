import type { StepTemplate, DeployStep } from '../../shared/types/project'

export function useTemplates() {
  const templates = ref<StepTemplate[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTemplates() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<StepTemplate[]>('/api/templates')
      templates.value = data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch templates'
    } finally {
      loading.value = false
    }
  }

  async function getTemplate(key: string) {
    try {
      return await $fetch<StepTemplate>(`/api/templates/${key}`)
    } catch (e) {
      throw e
    }
  }

  async function createTemplate(data: StepTemplate) {
    try {
      const template = await $fetch<StepTemplate>('/api/templates', {
        method: 'POST',
        body: data
      })
      await fetchTemplates()
      return template
    } catch (e) {
      throw e
    }
  }

  async function updateTemplate(key: string, data: Partial<StepTemplate>) {
    try {
      const template = await $fetch<StepTemplate>(`/api/templates/${key}`, {
        method: 'PUT',
        body: data
      })
      await fetchTemplates()
      return template
    } catch (e) {
      throw e
    }
  }

  async function deleteTemplate(key: string) {
    try {
      await $fetch(`/api/templates/${key}`, {
        method: 'DELETE' as any
      })
      await fetchTemplates()
    } catch (e) {
      throw e
    }
  }

  async function getTemplateByKey(key: string): Promise<StepTemplate | undefined> {
    try {
      return await $fetch<StepTemplate>(`/api/templates/${key}`)
    } catch (e) {
      return undefined
    }
  }

  function generateStepsFromTemplate(template: StepTemplate): DeployStep[] {
    return template.steps.map((s, i) => ({
      ...s,
      id: Math.random().toString(36).substring(2, 10),
      order: i + 1
    }))
  }

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateByKey,
    generateStepsFromTemplate
  }
}
