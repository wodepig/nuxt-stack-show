<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <UContainer>
      <div class="max-w-4xl mx-auto">
        <div class="mb-6">
          <UButton
            to="/"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-left"
          >
            返回
          </UButton>
        </div>

        <UCard>
          <template #header>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">新建项目</h1>
            <p class="text-sm text-gray-500 mt-1">配置一个新的文档管理项目</p>
          </template>

          <div class="space-y-8">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">基本信息</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UFormField label="项目名称" name="name" required>
                  <UInput
                    v-model="form.name"
                    placeholder="输入项目名称"
                    class="w-full"
                  />
                  <template #help>
                    <span class="text-xs text-gray-500">用于标识项目的名称</span>
                  </template>
                </UFormField>

                <UFormField label="项目描述" name="description">
                  <UInput
                    v-model="form.description"
                    placeholder="简短描述"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>

            <UDivider />

            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">仓库配置</h2>
              <div class="space-y-6">
                <UFormField label="GitHub URL" name="gitUrl" required>
                  <UInput
                    v-model="form.gitUrl"
                    placeholder="https://github.com/user/repo"
                    icon="i-heroicons-link"
                    class="w-full"
                  />
                  <template #help>
                    <span class="text-xs text-gray-500">完整的 GitHub 仓库地址</span>
                  </template>
                </UFormField>

                <UFormField label="分支" name="branch">
                  <UInput
                    v-model="form.branch"
                    placeholder="main"
                    icon="i-heroicons-code-branch"
                    class="w-48"
                  />
                </UFormField>
              </div>
            </div>

            <UDivider />

            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">服务配置</h2>
              <div class="space-y-6">
                <UFormField label="域名类型" name="domainType" required>
                  <URadioGroup
                    v-model="form.domainType"
                    :items="domainTypeOptions"
                    orientation="horizontal"
                  />
                  <template #help>
                    <span class="text-xs text-gray-500">
                      {{ form.domainType === 'internal' ? '内网访问：通过端口访问服务' : '外网访问：通过固定域名直接访问' }}
                    </span>
                  </template>
                </UFormField>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <UFormField label="内网域名" name="domain" required>
                    <UInput
                      v-model="form.domain"
                      placeholder="localhost"
                      icon="i-heroicons-globe-alt"
                      class="w-full"
                    />
                    <template #help>
                      <span class="text-xs text-gray-500">内网访问使用的域名（如 localhost 或内网 IP）</span>
                    </template>
                  </UFormField>

                  <UFormField label="服务端口" name="port" required>
                    <UInput
                      v-model.number="form.port"
                      type="number"
                      placeholder="3001"
                      icon="i-heroicons-hashtag"
                      class="w-40"
                    />
                    <template #help>
                      <span class="text-xs text-gray-500">服务启动时监听的端口</span>
                    </template>
                  </UFormField>
                </div>

                <UFormField
                  v-if="form.domainType === 'external'"
                  label="外网域名"
                  name="externalDomain"
                  required
                >
                  <UInput
                    v-model="form.externalDomain"
                    placeholder="docs.example.com"
                    icon="i-heroicons-globe-alt"
                    class="w-full"
                  />
                  <template #help>
                    <span class="text-xs text-gray-500">外网访问的固定域名（需提前配置反向代理）</span>
                  </template>
                </UFormField>
              </div>
            </div>

            <UDivider />

            <div>
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">部署步骤</h2>
                  <p class="text-sm text-gray-500 mt-1">配置项目的部署流程</p>
                </div>
                <USelect
                  v-model="selectedTemplate"
                  :items="templateOptions"
                  placeholder="选择预设模板"
                  class="w-48"
                />
              </div>
              <StepEditor v-model="form.steps" />
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                to="/"
                color="neutral"
                variant="soft"
              >
                取消
              </UButton>
              <UButton
                type="submit"
                color="primary"
                icon="i-heroicons-check"
                :loading="submitting"
                @click="handleSubmit"
              >
                创建项目
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { DeployStep, StepTemplate, DomainType } from '../../../shared/types/project'

const router = useRouter()
const { createProject } = useProjects()
const { templates, fetchTemplates, getTemplate } = useTemplates()

onMounted(() => {
  fetchTemplates()
})

const submitting = ref(false)
const selectedTemplate = ref('')

const templateOptions = computed(() =>
  templates.value.map((t: StepTemplate) => ({ label: t.name, value: t.key }))
)

const domainTypeOptions = [
  { label: '内网访问', value: 'internal' as DomainType },
  { label: '外网访问', value: 'external' as DomainType }
]

const form = reactive({
  name: '',
  description: '',
  gitUrl: '',
  branch: 'main',
  domain: 'localhost',
  domainType: 'internal' as DomainType,
  externalDomain: '',
  port: 3001,
  steps: [] as DeployStep[]
})

watch(selectedTemplate, (key) => {
  if (!key) return
  
  // 选择"自定义"时不清空步骤，保留当前步骤让用户继续编辑
  if (key === 'custom') {
    return
  }
  
  const template = getTemplate(key)
  if (template && template.steps.length > 0) {
    const newSteps: DeployStep[] = template.steps.map((s, i) => ({
      ...s,
      id: Math.random().toString(36).substring(2, 10),
      order: i + 1
    }))
    form.steps = newSteps
  }
})

async function handleSubmit() {
  if (!form.name) {
    alert('请输入项目名称')
    return
  }
  if (!form.gitUrl) {
    alert('请输入 GitHub URL')
    return
  }
  if (!form.domain) {
    alert('请输入绑定域名')
    return
  }
  if (!form.port) {
    alert('请输入服务端口')
    return
  }
  if (form.domainType === 'external' && !form.externalDomain) {
    alert('请输入外网域名')
    return
  }
  if (form.steps.length === 0) {
    alert('请至少配置一个部署步骤')
    return
  }

  submitting.value = true
  try {
    await createProject({
      name: form.name,
      description: form.description,
      gitUrl: form.gitUrl,
      branch: form.branch,
      domain: form.domain,
      domainType: form.domainType,
      externalDomain: form.externalDomain || undefined,
      port: form.port,
      steps: form.steps
    })
    router.push('/')
  } catch (e) {
    console.error('Create failed:', e)
    alert('创建失败: ' + (e instanceof Error ? e.message : '未知错误'))
  } finally {
    submitting.value = false
  }
}
</script>
