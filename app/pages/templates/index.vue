<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer>
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">步骤模板管理</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">管理项目部署步骤模板</p>
        </div>
        <div class="flex gap-3">
          <UButton
            to="/"
            color="neutral"
            variant="soft"
            icon="i-heroicons-arrow-left"
          >
            返回
          </UButton>
          <UButton
            color="primary"
            icon="i-heroicons-plus"
            @click="openCreateModal"
          >
            新建模板
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

      <div v-else-if="templates.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-document-duplicate" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无模板</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">创建您的第一个部署步骤模板</p>
        <UButton color="primary" icon="i-heroicons-plus" @click="openCreateModal">
          新建模板
        </UButton>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UCard v-for="template in templates" :key="template.key" class="hover:shadow-lg transition-shadow">
          <template #header>
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">{{ template.name }}</h3>
                <p class="text-sm text-gray-500">{{ template.key }}</p>
              </div>
              <UBadge color="primary" variant="soft" size="sm">
                {{ template.steps.length }} 个步骤
              </UBadge>
            </div>
          </template>

          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {{ template.description }}
          </p>

          <div class="space-y-2">
            <div
              v-for="(step, index) in template.steps.slice(0, 3)"
              :key="index"
              class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <span class="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs">
                {{ index + 1 }}
              </span>
              <span class="truncate">{{ step.name }}</span>
            </div>
            <p v-if="template.steps.length > 3" class="text-xs text-gray-400 pl-7">
              还有 {{ template.steps.length - 3 }} 个步骤...
            </p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-heroicons-pencil-square"
                @click="openEditModal(template)"
              >
                编辑
              </UButton>
              <UButton
                v-if="!isDefaultTemplate(template.key)"
                color="error"
                variant="ghost"
                size="sm"
                icon="i-heroicons-trash"
                @click="handleDelete(template)"
              >
                删除
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </UContainer>

    <!-- 创建/编辑模板弹窗 -->
    <UModal v-model:open="showModal" :title="isEditing ? '编辑模板' : '新建模板'">
      <template #body>
        <div class="space-y-6">
          <UFormField label="模板标识" name="key" required>
            <UInput
              v-model="form.key"
              placeholder="nuxt-project"
              :disabled="isEditing"
              class="w-full"
            />
            <template #help>
              <span class="text-xs text-gray-500">唯一标识，创建后不可修改</span>
            </template>
          </UFormField>

          <UFormField label="模板名称" name="name" required>
            <UInput
              v-model="form.name"
              placeholder="Nuxt 项目"
              class="w-full"
            />
          </UFormField>

          <UFormField label="描述" name="description">
            <UInput
              v-model="form.description"
              placeholder="适用于 Nuxt 3/4 项目"
              class="w-full"
            />
          </UFormField>

          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">部署步骤</h3>
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                icon="i-heroicons-plus"
                @click="addStep"
              >
                添加步骤
              </UButton>
            </div>

            <div class="space-y-3">
              <div
                v-for="(step, index) in form.steps"
                :key="index"
                class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex items-center gap-2 mb-3">
                  <span class="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-medium text-primary-600 dark:text-primary-400">
                    {{ index + 1 }}
                  </span>
                  <span class="text-sm font-medium">步骤 {{ index + 1 }}</span>
                  <UButton
                    color="error"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-trash"
                    class="ml-auto"
                    @click="removeStep(index)"
                  />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <UFormField label="步骤名称" :name="`step-${index}-name`" required>
                    <UInput
                      v-model="step.name"
                      placeholder="安装依赖"
                      size="sm"
                    />
                  </UFormField>

                  <UFormField label="步骤类型" :name="`step-${index}-type`" required>
                    <USelect
                      v-model="step.type"
                      :items="stepTypeOptions"
                      size="sm"
                    />
                  </UFormField>

                  <UFormField
                    v-if="step.type === 'shell' || step.type === 'start_service'"
                    label="命令"
                    :name="`step-${index}-command`"
                    class="md:col-span-2"
                  >
                    <UInput
                      v-model="step.command"
                      placeholder="pnpm install"
                      size="sm"
                    />
                  </UFormField>

                  <UFormField
                    label="工作目录"
                    :name="`step-${index}-workingDir`"
                    class="md:col-span-2"
                  >
                    <UInput
                      v-model="step.workingDir"
                      placeholder="./"
                      size="sm"
                    />
                  </UFormField>

                  <div class="flex items-center gap-2 md:col-span-2">
                    <UCheckbox v-model="step.enabled" label="启用此步骤" />
                  </div>
                </div>
              </div>
            </div>

            <p v-if="form.steps.length === 0" class="text-center text-sm text-gray-500 py-4">
              点击"添加步骤"按钮添加部署步骤
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="showModal = false">
            取消
          </UButton>
          <UButton
            color="primary"
            icon="i-heroicons-check"
            :loading="submitting"
            @click="handleSubmit"
          >
            {{ isEditing ? '保存' : '创建' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { StepTemplate, DeployStepType } from '../../../shared/types/project'

const { templates, loading, error, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = useTemplates()

const showModal = ref(false)
const isEditing = ref(false)
const submitting = ref(false)

const DEFAULT_KEYS = ['nuxtui', 'nuxt', 'demo', 'static', 'custom']

const stepTypeOptions = [
  { label: 'Git 克隆', value: 'git_clone' as DeployStepType },
  { label: 'Git 拉取', value: 'git_pull' as DeployStepType },
  { label: 'Shell 命令', value: 'shell' as DeployStepType },
  { label: '关闭进程', value: 'kill_process' as DeployStepType },
  { label: '启动服务', value: 'start_service' as DeployStepType }
]

const form = reactive({
  key: '',
  name: '',
  description: '',
  steps: [] as Array<{
    name: string
    type: DeployStepType
    command?: string
    workingDir?: string
    enabled: boolean
    order: number
  }>
})

onMounted(() => {
  fetchTemplates()
})

function isDefaultTemplate(key: string): boolean {
  return DEFAULT_KEYS.includes(key)
}

function openCreateModal() {
  isEditing.value = false
  form.key = ''
  form.name = ''
  form.description = ''
  form.steps = []
  showModal.value = true
}

function openEditModal(template: StepTemplate) {
  isEditing.value = true
  form.key = template.key
  form.name = template.name
  form.description = template.description
  form.steps = template.steps.map((s, i) => ({
    name: s.name,
    type: s.type,
    command: s.command,
    workingDir: s.workingDir,
    enabled: s.enabled,
    order: s.order || i + 1
  }))
  showModal.value = true
}

function addStep() {
  form.steps.push({
    name: '',
    type: 'shell',
    enabled: true,
    order: form.steps.length + 1
  })
}

function removeStep(index: number) {
  form.steps.splice(index, 1)
  // 重新排序
  form.steps.forEach((step, i) => {
    step.order = i + 1
  })
}

async function handleSubmit() {
  if (!form.key) {
    alert('请输入模板标识')
    return
  }
  if (!form.name) {
    alert('请输入模板名称')
    return
  }
  if (form.steps.length === 0) {
    alert('请至少添加一个步骤')
    return
  }

  // 验证步骤
  for (const step of form.steps) {
    if (!step.name) {
      alert('请填写所有步骤的名称')
      return
    }
    if ((step.type === 'shell' || step.type === 'start_service') && !step.command) {
      alert(`步骤 "${step.name}" 需要填写命令`)
      return
    }
  }

  submitting.value = true
  try {
    const templateData: StepTemplate = {
      key: form.key,
      name: form.name,
      description: form.description,
      steps: form.steps.map(s => ({
        name: s.name,
        type: s.type,
        command: s.command,
        workingDir: s.workingDir,
        enabled: s.enabled,
        order: s.order
      }))
    }

    if (isEditing.value) {
      await updateTemplate(form.key, templateData)
    } else {
      await createTemplate(templateData)
    }
    showModal.value = false
  } catch (e) {
    alert((e instanceof Error ? e.message : '操作失败'))
  } finally {
    submitting.value = false
  }
}

async function handleDelete(template: StepTemplate) {
  if (confirm(`确定要删除模板 "${template.name}" 吗？`)) {
    try {
      await deleteTemplate(template.key)
    } catch (e) {
      alert('删除失败：' + (e instanceof Error ? e.message : '未知错误'))
    }
  }
}
</script>
