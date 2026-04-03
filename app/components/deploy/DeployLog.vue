<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">部署日志</h2>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-heroicons-arrow-path"
          :loading="loading"
          @click="refreshLogs"
        >
          刷新
        </UButton>
      </div>
    </template>

    <div v-if="loading && logs.length === 0" class="flex justify-center py-8">
      <ULoadingIcon />
    </div>

    <div v-else-if="logs.length === 0" class="text-center py-8 text-gray-500">
      暂无部署日志
    </div>

    <div v-else class="space-y-3 max-h-96 overflow-y-auto">
      <div
        v-for="log in sortedLogs"
        :key="log.id"
        class="p-3 rounded-lg border"
        :class="logClass(log.status)"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <UBadge
                :color="statusColor(log.status)"
                size="xs"
              >
                {{ statusText(log.status) }}
              </UBadge>
              <span class="text-xs text-gray-500">
                {{ formatTime(log.createdAt) }}
              </span>
            </div>
            <p class="text-sm">{{ log.message }}</p>
            <pre
              v-if="log.details"
              class="mt-2 text-xs bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto whitespace-pre-wrap"
            >{{ log.details }}</pre>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { DeployLog, DeployLogStatus } from '../../../shared/types/project'

interface Props {
  projectId: string
}

const props = defineProps<Props>()

const logs = ref<DeployLog[]>([])
const loading = ref(false)

// 定时刷新
let refreshInterval: ReturnType<typeof setInterval> | null = null

const sortedLogs = computed(() =>
  [...logs.value].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
)

function logClass(status: DeployLogStatus) {
  const classes: Record<DeployLogStatus, string> = {
    running: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    failed: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }
  return classes[status] || ''
}

function statusColor(status: DeployLogStatus): 'info' | 'success' | 'error' | 'neutral' {
  const colors: Record<DeployLogStatus, 'info' | 'success' | 'error' | 'neutral'> = {
    running: 'info',
    success: 'success',
    failed: 'error'
  }
  return colors[status] || 'neutral'
}

function statusText(status: DeployLogStatus) {
  const texts: Record<DeployLogStatus, string> = {
    running: '执行中',
    success: '成功',
    failed: '失败'
  }
  return texts[status] || status
}

function formatTime(time: string) {
  return new Date(time).toLocaleString('zh-CN')
}

async function refreshLogs() {
  loading.value = true
  try {
    const data = await $fetch<DeployLog[]>(`/api/projects/${props.projectId}/logs`, {
      query: { limit: 100 }
    })
    logs.value = data
  } catch (e) {
    console.error('Failed to fetch logs:', e)
  } finally {
    loading.value = false
  }
}

function startAutoRefresh() {
  // 每 3 秒自动刷新一次
  refreshInterval = setInterval(() => {
    refreshLogs()
  }, 3000)
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

onMounted(() => {
  refreshLogs()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

// 监听项目 ID 变化，重新获取日志
watch(() => props.projectId, () => {
  logs.value = []
  refreshLogs()
})
</script>
