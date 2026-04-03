<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium">部署步骤</h3>
      <USelect
        v-model="selectedTemplate"
        :options="templateOptions"
        placeholder="选择预设模板"
        class="w-48"
      />
    </div>

    <div class="space-y-2">
      <div
        v-for="(step, index) in sortedSteps"
        :key="step.id"
        class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-bars-3" class="w-4 h-4 text-gray-400 cursor-move" />
          <span class="text-sm font-medium w-6">{{ index + 1 }}</span>
        </div>

        <UInput
          v-model="step.name"
          placeholder="步骤名称"
          class="flex-1"
        />

        <USelect
          v-model="step.type"
          :options="stepTypeOptions"
          class="w-32"
        />

        <UInput
          v-if="showCommandInput(step.type)"
          v-model="step.command"
          placeholder="命令"
          class="flex-1"
        />

        <UToggle v-model="step.enabled" />

        <UButton
          color="error"
          variant="ghost"
          size="xs"
          icon="i-heroicons-trash"
          @click="removeStep(step.id)"
        />
      </div>
    </div>

    <UButton
      color="neutral"
      variant="soft"
      icon="i-heroicons-plus"
      @click="addStep"
    >
      添加步骤
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { DeployStep, StepTemplate } from '../../../shared/types/project'

interface Props {
  modelValue: DeployStep[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [steps: DeployStep[]]
}>()

const { templates, fetchTemplates, getTemplateByKey } = useTemplates()

onMounted(() => {
  fetchTemplates()
})

const selectedTemplate = ref('')

const templateOptions = computed(() =>
  templates.value.map((t: StepTemplate) => ({ label: t.name, value: t.key }))
)

const stepTypeOptions = [
  { label: 'Git克隆', value: 'git_clone' },
  { label: 'Shell命令', value: 'shell' },
  { label: '关闭进程', value: 'kill_process' },
  { label: '启动服务', value: 'start_service' }
]

const sortedSteps = computed({
  get: () => [...props.modelValue].sort((a, b) => a.order - b.order),
  set: (val: DeployStep[]) => emit('update:modelValue', val)
})

function showCommandInput(type: string) {
  return type === 'shell' || type === 'start_service'
}

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

function addStep() {
  const newStep: DeployStep = {
    id: generateId(),
    name: '新步骤',
    type: 'shell',
    command: '',
    enabled: true,
    order: props.modelValue.length + 1
  }
  emit('update:modelValue', [...props.modelValue, newStep])
}

function removeStep(id: string) {
  const filtered = props.modelValue.filter(s => s.id !== id)
  const reordered = filtered.map((s, i) => ({ ...s, order: i + 1 }))
  emit('update:modelValue', reordered)
}

async function applyTemplate(key: string) {
  const template = await getTemplateByKey(key)
  if (template && template.steps.length > 0) {
    const newSteps: DeployStep[] = template.steps.map((s, i) => ({
      ...s,
      id: generateId(),
      order: i + 1
    }))
    emit('update:modelValue', newSteps)
  }
}

watch(selectedTemplate, async (newVal) => {
  if (newVal) {
    await applyTemplate(newVal)
  }
})
</script>
