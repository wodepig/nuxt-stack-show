export function useSettings() {
  const simplifiedCommands = ref<string[]>([])
  const loading = ref(false)

  async function fetchSimplifiedCommands() {
    loading.value = true
    try {
      const data = await $fetch<string[]>('/api/settings/simplified-commands')
      simplifiedCommands.value = data
      return data
    } catch (e) {
      console.error('Failed to fetch simplified commands:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function saveSimplifiedCommands(commands: string[]) {
    loading.value = true
    try {
      const result = await $fetch<{ success: boolean; commands: string[] }>('/api/settings/simplified-commands', {
        method: 'PUT',
        body: { commands }
      })
      simplifiedCommands.value = result.commands
      return result
    } catch (e) {
      console.error('Failed to save simplified commands:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    simplifiedCommands,
    loading,
    fetchSimplifiedCommands,
    saveSimplifiedCommands
  }
}
