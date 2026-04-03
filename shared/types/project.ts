export type ProjectStatus = 'idle' | 'cloning' | 'installing' | 'building' | 'running' | 'error'

export type DeployStepType = 'git_clone' | 'git_pull' | 'shell' | 'kill_process' | 'start_service'

export type DomainType = 'internal' | 'external'

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
  domainType: DomainType
  externalDomain?: string
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
