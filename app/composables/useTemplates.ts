import type { StepTemplate } from '../../shared/types/project'

export function useTemplates() {
  const templates = ref<StepTemplate[]>([])
  const loading = ref(false)

  async function fetchTemplates() {
    loading.value = true
    try {
      const data = await $fetch<StepTemplate[]>('/api/projects/templates')
      templates.value = data
    } finally {
      loading.value = false
    }
  }

  function getTemplate(key: string): StepTemplate | undefined {
    return templates.value.find((t: StepTemplate) => t.key === key)
  }

  return {
    templates,
    loading,
    fetchTemplates,
    getTemplate
  }
}
