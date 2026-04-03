<template>
  <UBadge
    :color="statusColor"
    :variant="statusVariant"
    size="sm"
  >
    <template #leading>
      <UIcon :name="statusIcon" class="w-3 h-3" />
    </template>
    {{ statusText }}
  </UBadge>
</template>

<script setup lang="ts">
import type { ProjectStatus } from '../../../shared/types/project'

interface Props {
  status: ProjectStatus
}

const props = defineProps<Props>()

const statusMap: Record<ProjectStatus, { color: string; text: string; icon: string }> = {
  idle: { color: 'neutral', text: '已停止', icon: 'i-heroicons-pause-circle' },
  cloning: { color: 'info', text: '下载中', icon: 'i-heroicons-arrow-down-tray' },
  installing: { color: 'info', text: '安装中', icon: 'i-heroicons-cog-6-tooth' },
  building: { color: 'warning', text: '构建中', icon: 'i-heroicons-hammer' },
  running: { color: 'success', text: '运行中', icon: 'i-heroicons-play-circle' },
  error: { color: 'error', text: '错误', icon: 'i-heroicons-exclamation-circle' }
}

const statusColor = computed(() => statusMap[props.status].color as any)
const statusText = computed(() => statusMap[props.status].text)
const statusIcon = computed(() => statusMap[props.status].icon)
const statusVariant = computed(() => props.status === 'running' ? 'solid' : 'soft')
</script>
