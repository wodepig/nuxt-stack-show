export type ProjectStatus = 'idle' | 'cloning' | 'installing' | 'building' | 'running' | 'error'

export type DeployStepType = 'git_clone' | 'git_pull' | 'shell' | 'kill_process' | 'start_service'

export interface DeployStep {
  id: string
  name: string
  type: DeployStepType
  command?: string
  workingDir?: string
  enabled: boolean
  order: number
}

export interface Project {
  id: string
  name: string
  description?: string
  gitUrl: string
  branch: string
  domain: string
  port: number
  steps: DeployStep[]
  status: ProjectStatus
  pid?: number
  lastUpdatedAt?: string
  createdAt: string
}

export type DeployLogType = 'clone' | 'pull' | 'install' | 'build' | 'start' | 'stop' | 'error'
export type DeployLogStatus = 'running' | 'success' | 'failed'

export interface DeployLog {
  id: string
  projectId: string
  stepId?: string
  type: DeployLogType
  message: string
  details?: string
  status: DeployLogStatus
  duration?: number
  createdAt: string
}

export interface StepTemplate {
  key: string
  name: string
  description: string
  steps: Omit<DeployStep, 'id'>[]
}

export const STEP_TEMPLATES: StepTemplate[] = [
    {
    key: 'nuxtui',
    name: 'Nuxt UI项目',
    description: '适用于 Nuxt UI 文档站点',
    steps: [
      { name: '下载/更新代码', type: 'git_clone', enabled: true, order: 1 },
      { name: '安装依赖', type: 'shell', command: 'pnpm install', enabled: true, order: 2 },
      { name: '生成类型', type: 'shell', command: 'pnpm run dev:prepare', enabled: true, order: 3 },
      { name: '构建项目', type: 'shell', command: 'pnpm docs:build', enabled: true, order: 4 },
      { name: '关闭旧进程', type: 'kill_process', enabled: true, order: 5 },
      { name: '启动服务', type: 'start_service', command: 'node .output/server/index.mjs', enabled: true, order: 6 },
    ]
  },
  {
    key: 'nuxt',
    name: 'Nuxt 项目',
    description: '适用于 Nuxt 3/4 文档站点',
    steps: [
      { name: '下载/更新代码', type: 'git_clone', enabled: true, order: 1 },
      { name: '安装依赖', type: 'shell', command: 'pnpm install', enabled: true, order: 2 },
      { name: '构建项目', type: 'shell', command: 'pnpm build', enabled: true, order: 3 },
      { name: '关闭旧进程', type: 'kill_process', enabled: true, order: 4 },
      { name: '启动服务', type: 'start_service', command: 'node .output/server/index.mjs', enabled: true, order: 5 },
    ]
  },
  {
    key: 'demo项目(nuxt项目)',
    name: 'Demo项目',
    description: 'demo测试https://github.com/wodepig/build-demo.git',
    steps: [
      { name: '下载/更新代码', type: 'git_clone', enabled: true, order: 1 },
      { name: '安装依赖', type: 'shell', command: 'pnpm install', enabled: true, order: 2 },
      { name: '构建项目', type: 'shell', command: 'pnpm build', enabled: true, order: 3 },
      { name: '关闭旧进程', type: 'kill_process', enabled: true, order: 4 },
      { name: '启动服务', type: 'start_service', command: 'node .output/server/index.mjs', enabled: true, order: 5 },
    ]
  },
  {
    key: 'static',
    name: '静态站点',
    description: '仅构建，不启动服务',
    steps: [
      { name: '下载/更新代码', type: 'git_clone', enabled: true, order: 1 },
      { name: '安装依赖', type: 'shell', command: 'pnpm install', enabled: true, order: 2 },
      { name: '构建项目', type: 'shell', command: 'pnpm build', enabled: true, order: 3 },
    ]
  },
  {
    key: 'custom',
    name: '自定义',
    description: '完全自定义部署步骤',
    steps: []
  }
]
