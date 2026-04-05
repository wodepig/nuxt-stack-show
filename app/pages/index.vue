<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer class="py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">文档项目管理</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">管理多个 GitHub 开源项目的帮助文档</p>
        </div>
        <div class="flex gap-3">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-heroicons-arrow-path"
            :loading="loading"
            @click="handleRefresh"
          >
            刷新
          </UButton>
          <UButton
            to="/templates"
            color="neutral"
            variant="soft"
            icon="i-heroicons-document-duplicate"
          >
            模板
          </UButton>
          <UButton
            color="neutral"
            variant="soft"
            icon="i-heroicons-cog-6-tooth"
            @click="showSettings = true"
          >
            设置
          </UButton>
          <UButton
            color="neutral"
            variant="soft"
            icon="i-heroicons-trash"
            @click="showCleanup = true"
          >
            清理
          </UButton>
          <UButton
            to="/projects/new"
            icon="i-heroicons-plus"
            size="lg"
          >
            新建项目
          </UButton>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <ULoadingIcon size="xl" />
      </div>

      <div v-else-if="error" class="text-center py-12">
        <UAlert
          color="error"
          icon="i-heroicons-exclamation-triangle"
          :title="error"
        />
      </div>

      <div v-else-if="projects.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-folder-open" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无项目</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">创建您的第一个文档项目</p>
        <UButton to="/projects/new" icon="i-heroicons-plus">新建项目</UButton>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          :deploying="deployingProjectId === project.id"
          :stopping="stoppingProjectId === project.id"
          :quick-deploying="quickDeployingProjectId === project.id"
          :can-quick-deploy="quickDeployChecks[project.id]?.canQuickDeploy"
          @deploy="handleDeploy"
          @quick-deploy="handleQuickDeploy"
          @stop="handleStop"
          @delete="handleDelete"
        />
      </div>
    </UContainer>

    <!-- 清理弹窗 -->
    <UModal v-model:open="showCleanup" title="清理空间">
      <template #body>
        <div class="space-y-4">
          <!-- 统计信息 -->
          <div v-if="stats" class="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p class="text-sm text-gray-500">项目目录</p>
              <p class="text-lg font-semibold">{{ stats.projectsSizeFormatted }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">日志文件</p>
              <p class="text-lg font-semibold">{{ stats.logsSizeFormatted }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">孤儿目录</p>
              <p class="text-lg font-semibold">{{ stats.orphanCount }} 个 ({{ stats.orphanSizeFormatted }})</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">总计</p>
              <p class="text-lg font-semibold">{{ stats.totalSizeFormatted }}</p>
            </div>
          </div>

          <div v-else class="flex justify-center py-4">
            <ULoadingIcon />
          </div>

          <!-- 清理按钮 -->
          <div class="flex gap-3">
            <UButton
              color="error"
              variant="soft"
              icon="i-heroicons-folder-minus"
              :loading="cleaningProjects"
              :disabled="!stats || stats.orphanCount === 0"
              class="flex-1"
              @click="handleCleanupProjects"
            >
              清理孤儿项目
            </UButton>
            <UButton
              color="error"
              variant="soft"
              icon="i-heroicons-document-minus"
              :loading="cleaningLogs"
              :disabled="!stats || stats.logsSize === 0"
              class="flex-1"
              @click="handleCleanupLogs"
            >
              清理日志
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- 设置弹窗 -->
    <UModal v-model:open="showSettings" title="系统设置" description="配置简化日志命令，减少日志文件大小">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500">配置哪些命令的输出会被简化存储</p>
          
          <div class="space-y-2">
            <div
              v-for="(cmd, index) in editableCommands"
              :key="index"
              class="flex items-center gap-2"
            >
              <UInput
                v-model="editableCommands[index]"
                placeholder="输入命令关键词"
                class="flex-1"
              />
              <UButton
                color="error"
                variant="ghost"
                size="sm"
                icon="i-heroicons-trash"
                @click="removeCommand(index)"
              />
            </div>
          </div>
          
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-heroicons-plus"
            @click="addCommand"
          >
            添加命令
          </UButton>
        </div>
      </template>
      
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="showSettings = false">
            取消
          </UButton>
          <UButton
            color="primary"
            icon="i-heroicons-check"
            :loading="savingSettings"
            @click="handleSaveSettings"
          >
            保存设置
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Project } from '../../shared/types/project'

const { projects, loading, error, fetchProjects, deleteProject } = useProjects()
const { deployProject, stopProject } = useDeploy()
const { stats, fetchStats, cleanupProjects, cleanupLogs } = useCleanup()
const { simplifiedCommands, fetchSimplifiedCommands, saveSimplifiedCommands } = useSettings()

const deployingProjectId = ref<string | null>(null)
const stoppingProjectId = ref<string | null>(null)
const quickDeployingProjectId = ref<string | null>(null)
const quickDeployChecks = ref<Record<string, { canQuickDeploy: boolean }>>({})
const showCleanup = ref(false)
const showSettings = ref(false)
const cleaningProjects = ref(false)
const cleaningLogs = ref(false)
const savingSettings = ref(false)

// 可编辑的命令列表
const editableCommands = ref<string[]>([])

onMounted(async () => {
  await fetchProjects()
  // 检查所有项目的快速部署条件
  checkAllQuickDeploy()
})

// 检查所有项目的快速部署条件
async function checkAllQuickDeploy() {
  for (const project of projects.value) {
    if (project.status !== 'running') {
      try {
        const result = await $fetch(`/api/projects/${project.id}/quick-deploy-check`)
        quickDeployChecks.value[project.id] = result as { canQuickDeploy: boolean }
      } catch {
        quickDeployChecks.value[project.id] = { canQuickDeploy: false }
      }
    }
  }
}

// 刷新项目列表
async function handleRefresh() {
  await fetchProjects()
  await checkAllQuickDeploy()
}

// 监听弹窗打开，获取数据
watch(showCleanup, (val) => {
  if (val) {
    fetchStats()
  }
})

watch(showSettings, async (val) => {
  if (val) {
    await fetchSimplifiedCommands()
    editableCommands.value = [...simplifiedCommands.value]
  }
})

async function handleDeploy(project: Project) {
  deployingProjectId.value = project.id
  try {
    const result = await deployProject(project.id)
    await fetchProjects()
    console.log('Deployed:', result)
  } catch (e) {
    console.error('Deploy failed:', e)
  } finally {
    deployingProjectId.value = null
  }
}

async function handleQuickDeploy(project: Project) {
  quickDeployingProjectId.value = project.id
  try {
    const result = await $fetch(`/api/projects/${project.id}/quick-deploy`, { method: 'POST' })
    await fetchProjects()
    console.log('Quick deployed:', result)
  } catch (e) {
    console.error('Quick deploy failed:', e)
    alert('快速部署失败：' + (e instanceof Error ? e.message : '未知错误'))
  } finally {
    quickDeployingProjectId.value = null
  }
}

async function handleStop(project: Project) {
  stoppingProjectId.value = project.id
  try {
    await stopProject(project.id)
    await fetchProjects()
  } catch (e) {
    console.error('Stop failed:', e)
  } finally {
    stoppingProjectId.value = null
  }
}

async function handleDelete(project: Project) {
  if (confirm(`确定要删除项目 "${project.name}" 吗？`)) {
    try {
      await deleteProject(project.id)
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }
}

async function handleCleanupProjects() {
  if (!stats.value || stats.value.orphanCount === 0) return
  
  const confirmed = confirm(`确定要清理 ${stats.value.orphanCount} 个孤儿项目目录吗？\n预计释放空间：${stats.value.orphanSizeFormatted}`)
  if (!confirmed) return

  cleaningProjects.value = true
  try {
    const result = await cleanupProjects()
    alert(`清理完成！\n删除了 ${result.cleanedCount} 个目录\n释放了 ${result.cleanedSizeFormatted} 空间`)
  } catch (e) {
    alert('清理失败：' + (e instanceof Error ? e.message : '未知错误'))
  } finally {
    cleaningProjects.value = false
  }
}

async function handleCleanupLogs() {
  if (!stats.value || stats.value.logsSize === 0) return
  
  const confirmed = confirm(`确定要清理所有部署日志吗？\n预计释放空间：${stats.value.logsSizeFormatted}`)
  if (!confirmed) return

  cleaningLogs.value = true
  try {
    const result = await cleanupLogs()
    alert(`清理完成！\n释放了 ${result.cleanedSizeFormatted} 空间`)
  } catch (e) {
    alert('清理失败：' + (e instanceof Error ? e.message : '未知错误'))
  } finally {
    cleaningLogs.value = false
  }
}

function addCommand() {
  editableCommands.value.push('')
}

function removeCommand(index: number) {
  editableCommands.value.splice(index, 1)
}

async function handleSaveSettings() {
  // 过滤空值
  const commands = editableCommands.value.filter(cmd => cmd.trim() !== '')
  
  savingSettings.value = true
  try {
    await saveSimplifiedCommands(commands)
    alert('设置已保存')
    showSettings.value = false
  } catch (e) {
    alert('保存失败：' + (e instanceof Error ? e.message : '未知错误'))
  } finally {
    savingSettings.value = false
  }
}
</script>
