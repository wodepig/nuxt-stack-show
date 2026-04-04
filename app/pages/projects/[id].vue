<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer class="py-8">
      <div v-if="loading" class="flex justify-center py-12">
        <ULoadingIcon size="xl" />
      </div>

      <template v-else-if="project">
        <div class="flex items-center gap-4 mb-8">
          <UButton
            to="/"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-left"
          />
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ project.name }}</h1>
            <p class="text-gray-600 dark:text-gray-400">{{ project.description }}</p>
          </div>
          <ProjectStatus :status="project.status" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <UCard>
              <template #header>
                <h2 class="text-lg font-semibold">项目信息</h2>
              </template>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-sm text-gray-500">GitHub URL</label>
                  <p class="text-sm font-medium truncate">{{ project.gitUrl }}</p>
                </div>
                <div>
                  <label class="text-sm text-gray-500">分支</label>
                  <p class="text-sm font-medium">{{ project.branch }}</p>
                </div>
                <div>
                  <label class="text-sm text-gray-500">域名类型</label>
                  <p class="text-sm font-medium">
                    <UBadge
                      :color="project.domainType === 'external' ? 'success' : 'neutral'"
                      variant="soft"
                      size="xs"
                    >
                      {{ project.domainType === 'external' ? '外网' : '内网' }}
                    </UBadge>
                  </p>
                </div>
                <div>
                  <label class="text-sm text-gray-500">端口</label>
                  <p class="text-sm font-medium">{{ project.port }}</p>
                </div>
                <div>
                  <label class="text-sm text-gray-500">内网域名</label>
                  <p class="text-sm font-medium">{{ project.domain }}</p>
                </div>
                <div v-if="project.domainType === 'external' && project.externalDomain">
                  <label class="text-sm text-gray-500">外网域名</label>
                  <p class="text-sm font-medium text-success-600 dark:text-success-400">{{ project.externalDomain }}</p>
                </div>
                <div v-if="project.pid">
                  <label class="text-sm text-gray-500">进程 ID</label>
                  <p class="text-sm font-medium">{{ project.pid }}</p>
                </div>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-semibold">部署步骤</h2>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-heroicons-pencil-square"
                    @click="showStepEditor = true"
                  >
                    编辑步骤
                  </UButton>
                </div>
              </template>

              <div class="space-y-2">
                <div
                  v-for="step in sortedSteps"
                  :key="step.id"
                  class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  :class="{ 'opacity-50': !step.enabled }"
                >
                  <UIcon
                    :name="step.enabled ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                    class="w-5 h-5"
                    :class="step.enabled ? 'text-green-500' : 'text-gray-400'"
                  />
                  <div class="flex-1">
                    <p class="font-medium">{{ step.name }}</p>
                    <p class="text-sm text-gray-500">{{ stepTypeLabel(step.type) }}</p>
                  </div>
                  <code v-if="step.command" class="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                    {{ step.command }}
                  </code>
                </div>
              </div>
            </UCard>

            <DeployLog :project-id="project.id" />
          </div>

          <div class="space-y-6">
            <UCard>
              <template #header>
                <h2 class="text-lg font-semibold">操作</h2>
              </template>

              <div class="space-y-3">
                <UButton
                  v-if="project.status === 'running'"
                  color="error"
                  block
                  icon="i-heroicons-stop"
                  :loading="stopping"
                  @click="handleStop"
                >
                  停止服务
                </UButton>
                <UButton
                  v-else
                  color="primary"
                  block
                  icon="i-heroicons-rocket-launch"
                  :loading="deploying"
                  @click="handleDeploy"
                >
                  部署项目
                </UButton>

                <template v-if="project.status === 'running'">
                  <UButton
                    v-if="project.domainType === 'external' && project.externalDomain"
                    color="success"
                    variant="soft"
                    block
                    icon="i-heroicons-globe-alt"
                    :to="`http://${project.externalDomain}`"
                    target="_blank"
                  >
                    外网访问
                  </UButton>
                  <UButton
                    color="neutral"
                    variant="soft"
                    block
                    icon="i-heroicons-arrow-top-right-on-square"
                    :to="`http://${project.domain}:${project.port}`"
                    target="_blank"
                  >
                    内网访问
                  </UButton>
                </template>
              </div>
            </UCard>
          </div>
        </div>
      </template>

      <div v-else class="text-center py-12">
        <UAlert
          color="error"
          icon="i-heroicons-exclamation-triangle"
          title="项目不存在"
        />
      </div>

      <!-- 步骤编辑弹窗 -->
      <UModal v-model:open="showStepEditor" title="编辑部署步骤" description="重新应用模板或自定义部署步骤">
        <template #body>
          <div class="space-y-6">
            <div class="flex items-center gap-3">
              <USelect
                v-model="selectedTemplateKey"
                :items="templateOptions"
                placeholder="选择模板重新应用"
                class="flex-1"
              />
              <UButton
                color="primary"
                size="sm"
                icon="i-heroicons-arrow-path"
                :loading="applyingTemplate"
                :disabled="!selectedTemplateKey"
                @click="applyTemplate"
              >
                应用
              </UButton>
            </div>

            <UDivider />

            <StepEditor v-model="editableSteps" />
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="soft" @click="showStepEditor = false">
              取消
            </UButton>
            <UButton
              color="primary"
              icon="i-heroicons-check"
              :loading="savingSteps"
              @click="saveSteps"
            >
              保存
            </UButton>
          </div>
        </template>
      </UModal>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { Project, DeployStep } from '../../../shared/types/project'

const route = useRoute()
const { getProject, updateProject } = useProjects()
const { deployProject, stopProject } = useDeploy()
const { templates, fetchTemplates, getTemplateByKey } = useTemplates()

const project = ref<Project | null>(null)
const loading = ref(true)
const deploying = ref(false)
const stopping = ref(false)
const showStepEditor = ref(false)
const selectedTemplateKey = ref('')
const applyingTemplate = ref(false)
const savingSteps = ref(false)
const editableSteps = ref<DeployStep[]>([])

const sortedSteps = computed(() =>
  [...(project.value?.steps || [])].sort((a, b) => a.order - b.order)
)

const templateOptions = computed(() =>
  templates.value.map((t) => ({ label: t.name, value: t.key }))
)

function stepTypeLabel(type: DeployStep['type']) {
  const labels: Record<string, string> = {
    git_clone: 'Git 克隆',
    shell: 'Shell 命令',
    kill_process: '关闭进程',
    start_service: '启动服务'
  }
  return labels[type] || type
}

async function loadProject() {
  loading.value = true
  try {
    project.value = await getProject(route.params.id as string)
  } catch (e) {
    console.error('Failed to load project:', e)
  } finally {
    loading.value = false
  }
}

async function handleDeploy() {
  if (!project.value) return
  deploying.value = true
  try {
    await deployProject(project.value.id)
    await loadProject()
  } catch (e) {
    console.error('Deploy failed:', e)
  } finally {
    deploying.value = false
  }
}

async function handleStop() {
  if (!project.value) return
  stopping.value = true
  try {
    await stopProject(project.value.id)
    await loadProject()
  } catch (e) {
    console.error('Stop failed:', e)
  } finally {
    stopping.value = false
  }
}

onMounted(() => {
  loadProject()
  fetchTemplates()
})

// 监听弹窗打开，初始化可编辑步骤
watch(showStepEditor, (val) => {
  if (val && project.value) {
    editableSteps.value = JSON.parse(JSON.stringify(project.value.steps))
  }
})

async function applyTemplate() {
  if (!selectedTemplateKey.value) return

  applyingTemplate.value = true
  try {
    const template = await getTemplateByKey(selectedTemplateKey.value)
    if (template && template.steps.length > 0) {
      editableSteps.value = template.steps.map((s, i) => ({
        ...s,
        id: Math.random().toString(36).substring(2, 10),
        order: i + 1
      }))
    }
  } catch (e) {
    alert('应用模板失败：' + (e instanceof Error ? e.message : '未知错误'))
  } finally {
    applyingTemplate.value = false
  }
}

async function saveSteps() {
  if (!project.value) return

  if (editableSteps.value.length === 0) {
    alert('请至少配置一个部署步骤')
    return
  }

  savingSteps.value = true
  try {
    await updateProject(project.value.id, {
      steps: editableSteps.value
    })
    await loadProject()
    showStepEditor.value = false
    alert('部署步骤已更新')
  } catch (e) {
    alert('保存失败：' + (e instanceof Error ? e.message : '未知错误'))
  } finally {
    savingSteps.value = false
  }
}
</script>
