<template>
  <UCard class="hover:shadow-lg transition-shadow">
    <template #header>
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ project.name }}</h3>
            <p class="text-sm text-gray-500">
              <template v-if="project.domainType === 'external' && project.externalDomain">
                {{ project.externalDomain }}
              </template>
              <template v-else>
                {{ project.domain }}:{{ project.port }}
              </template>
              <UBadge
                :color="project.domainType === 'external' ? 'success' : 'neutral'"
                variant="soft"
                size="xs"
                class="ml-2"
              >
                {{ project.domainType === 'external' ? '外网' : '内网' }}
              </UBadge>
            </p>
          </div>
        </div>
        <ProjectStatus :status="project.status" />
      </div>
    </template>

    <p v-if="project.description" class="text-sm text-gray-600 dark:text-gray-400 mb-4">
      {{ project.description }}
    </p>

    <div class="space-y-2 text-sm">
      <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <UIcon name="i-heroicons-link" class="w-4 h-4" />
        <span class="truncate">{{ project.gitUrl }}</span>
      </div>
      <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <UIcon name="i-heroicons-code-branch" class="w-4 h-4" />
        <span>{{ project.branch }}</span>
      </div>
      <div v-if="project.pid" class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <UIcon name="i-heroicons-cpu-chip" class="w-4 h-4" />
        <span>PID: {{ project.pid }}</span>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between">
        <div class="flex gap-2">
          <UButton
            v-if="project.status === 'running'"
            color="error"
            variant="soft"
            size="sm"
            icon="i-heroicons-stop"
            :loading="stopping"
            @click="$emit('stop', project)"
          >
            停止
          </UButton>
          <template v-else>
            <UButton
              color="primary"
              size="sm"
              icon="i-heroicons-rocket-launch"
              :loading="deploying"
              @click="$emit('deploy', project)"
            >
              部署
            </UButton>
            <UButton
              v-if="canQuickDeploy"
              color="success"
              variant="soft"
              size="sm"
              icon="i-heroicons-bolt"
              :loading="quickDeploying"
              @click="$emit('quickDeploy', project)"
            >
              快速启动
            </UButton>
          </template>
          <template v-if="project.status === 'running'">
            <UButton
              v-if="project.domainType === 'external' && project.externalDomain"
              color="success"
              variant="soft"
              size="sm"
              icon="i-heroicons-globe-alt"
              :to="`http://${project.externalDomain}`"
              target="_blank"
            >
              外网访问
            </UButton>
            <UButton
              v-else
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-arrow-top-right-on-square"
              :to="`http://${project.domain}:${project.port}`"
              target="_blank"
            >
              内网访问
            </UButton>
          </template>
        </div>
        <div class="flex gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-pencil-square"
            :to="`/projects/${project.id}`"
          />
          <UButton
            color="error"
            variant="ghost"
            size="sm"
            icon="i-heroicons-trash"
            @click="$emit('delete', project)"
          />
        </div>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import type { Project } from '../../../shared/types/project'

interface Props {
  project: Project
  deploying?: boolean
  stopping?: boolean
  quickDeploying?: boolean
  canQuickDeploy?: boolean
}

defineProps<Props>()

defineEmits<{
  deploy: [project: Project]
  quickDeploy: [project: Project]
  stop: [project: Project]
  delete: [project: Project]
}>()
</script>
