<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">部署日志</h2>
        <div class="flex items-center gap-2">
          <span v-if="!isRefreshing" class="text-xs text-gray-500">已暂停</span>
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
        v-for="log in displayLogs"
        :key="log.id"
        class="p-3 rounded-lg border"
        :class="logClass(log.status)"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
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
              class="mt-2 text-xs bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto"
            >{{ truncateDetails(log.details) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { DeployLog, DeployLogStatus, ProjectStatus } from '../../../shared/types/project'

interface Props {
  projectId: string
  projectStatus?: ProjectStatus
}

const props = defineProps<Props>()

const logs = ref<DeployLog[]>([])
const loading = ref(false)
const lastLogTime = ref<string | null>(null)
const MAX_DISPLAY_LOGS = 20 // 最多显示 20 条日志
const MAX_DETAILS_DISPLAY = 1000 // 前端 details 最大显示长度

// 定时刷新
let refreshInterval: ReturnType<typeof setInterval> | null = null

// 是否应该继续刷新日志（部署成功或失败后停止）
const isRefreshing = computed(() => {
  return props.projectStatus === 'building' || props.projectStatus === 'cloning' || props.projectStatus === 'installing'
})

// 限制显示的日志数量
const displayLogs = computed(() => {
  const sorted = [...logs.value].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return sorted.slice(0, MAX_DISPLAY_LOGS)
})

// 截断 details 内容
function truncateDetails(details: string): string {
  if (details.length > MAX_DETAILS_DISPLAY) {
    return details.substring(0, MAX_DETAILS_DISPLAY) + '\n... (内容已截断)'
  }
  return details
}

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
    const query: Record<string, string> = {}
    
    // 增量获取：只获取最新日志
    if (lastLogTime.value) {
      query.since = lastLogTime.value
    }
    
    const data = await $fetch<DeployLog[]>(`/api/projects/${props.projectId}/logs`, {
      query
    })
    
    if (data.length > 0) {
      // 合并新日志到现有日志
      const existingIds = new Set(logs.value.map(l => l.id))
      const newLogs = data.filter(l => !existingIds.has(l.id))
      logs.value = [...logs.value, ...newLogs]
      
      // 更新最后日志时间
      const latestLog = data.reduce((latest, current) => 
        new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
      )
      lastLogTime.value = latestLog.createdAt
      
      // 限制本地日志数量
      if (logs.value.length > MAX_DISPLAY_LOGS * 2) {
        logs.value = logs.value
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_DISPLAY_LOGS * 2)
      }
    }
  } catch (e) {
    console.error('Failed to fetch logs:', e)
  } finally {
    loading.value = false
  }
}

// 重置并刷新日志（部署开始时调用）
function resetAndRefresh() {
  logs.value = []
  lastLogTime.value = null
  refreshLogs()
}

function startAutoRefresh() {
  // 每 2 秒自动刷新一次
  refreshInterval = setInterval(() => {
    if (isRefreshing.value) {
      refreshLogs()
    }
  }, 2000)
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// 暴露方法供父组件调用
defineExpose({
  resetAndRefresh
})

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
  lastLogTime.value = null
  refreshLogs()
})

// 监听项目状态变化，部署开始时重置日志
watch(() => props.projectStatus, (newStatus, oldStatus) => {
  const deployingStatuses = ['cloning', 'installing', 'building']
  const wasNotDeploying = oldStatus && !deployingStatuses.includes(oldStatus)
  const isNowDeploying = newStatus && deployingStatuses.includes(newStatus)
  
  if (isNowDeploying && wasNotDeploying) {
    // 部署开始，重置日志
    logs.value = []
    lastLogTime.value = null
    refreshLogs()
  }
})
</script>
