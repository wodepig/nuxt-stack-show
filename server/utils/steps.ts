import { killProcess, executeCommand, startService, findProcessByPort } from './process'
import { executeGitStep, getProjectPath } from './git'
import type { Project, DeployStep, DeployLog } from '../types'
import type { DeployLogType, DeployLogStatus } from '../../shared/types/project'

export interface StepResult {
  success: boolean
  output: string
  error?: string
  pid?: number
}

export interface DeployContext {
  project: Project
  logCallback?: (log: Partial<DeployLog>) => void
}

export async function executeStep(
  step: DeployStep,
  context: DeployContext
): Promise<StepResult> {
  const { project } = context
  const projectPath = await getProjectPath(project.id)

  switch (step.type) {
    case 'git_clone':
      return executeGitCloneStep(project, context)

    case 'shell':
      return executeShellStep(step, projectPath)

    case 'kill_process':
      return executeKillProcessStep(project, context)

    case 'start_service':
      return executeStartServiceStep(step, project, context)

    default:
      return {
        success: false,
        output: '',
        error: `Unknown step type: ${step.type}`
      }
  }
}

async function executeGitCloneStep(
  project: Project,
  context: DeployContext
): Promise<StepResult> {
  try {
    const result = await executeGitStep(project.id, project.gitUrl, project.branch)
    return {
      success: result.success,
      output: result.output,
      error: result.success ? undefined : 'Git operation failed'
    }
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function executeShellStep(
  step: DeployStep,
  projectPath: string
): Promise<StepResult> {
  if (!step.command) {
    return {
      success: false,
      output: '',
      error: 'No command specified for shell step'
    }
  }

  try {
    const workingDir = step.workingDir || projectPath
    const { promise } = executeCommand(step.command, workingDir)
    const { code, output } = await promise

    return {
      success: code === 0,
      output,
      error: code === 0 ? undefined : `Command failed with exit code ${code}`
    }
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function executeKillProcessStep(
  project: Project,
  context: DeployContext
): Promise<StepResult> {
  try {
    let killed = false
    let output = ''

    if (project.pid) {
      killed = await killProcess(project.pid)
      output = killed ? `Killed process ${project.pid}` : `Failed to kill process ${project.pid}`
    }

    const portPid = await findProcessByPort(project.port)
    if (portPid && portPid !== project.pid) {
      const portKilled = await killProcess(portPid)
      output += portKilled ? `, killed port process ${portPid}` : `, failed to kill port process ${portPid}`
      killed = killed || portKilled
    }

    if (!project.pid && !portPid) {
      output = 'No process to kill'
      killed = true
    }

    return {
      success: killed,
      output,
      error: killed ? undefined : 'Failed to kill process'
    }
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function executeStartServiceStep(
  step: DeployStep,
  project: Project,
  context: DeployContext
): Promise<StepResult> {
  if (!step.command) {
    return {
      success: false,
      output: '',
      error: 'No command specified for start_service step'
    }
  }

  try {
    const projectPath = await getProjectPath(project.id)
    const workingDir = step.workingDir || projectPath

    const command = step.command.replace(/\{\{port\}\}/g, project.port.toString())

    const { pid, promise } = startService(command, workingDir, {
      PORT: project.port.toString(),
      NODE_ENV: 'production'
    })

    context.logCallback?.({
      projectId: project.id,
      type: 'start',
      message: `Service started with PID ${pid}`,
      status: 'running'
    })

    return {
      success: true,
      output: `Service started with PID ${pid}`,
      pid
    }
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function executeDeploy(
  project: Project,
  logCallback?: (log: Partial<DeployLog>) => void
): Promise<{ success: boolean; error?: string; pid?: number }> {
  const steps = project.steps
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order)

  const context: DeployContext = { project, logCallback }
  let finalPid: number | undefined

  for (const step of steps) {
    logCallback?.({
      projectId: project.id,
      stepId: step.id,
      type: getLogType(step.type),
      message: `Starting: ${step.name}`,
      status: 'running'
    })

    const result = await executeStep(step, context)

    if (result.pid) {
      finalPid = result.pid
    }

    if (!result.success) {
      logCallback?.({
        projectId: project.id,
        stepId: step.id,
        type: 'error',
        message: `Failed: ${step.name}`,
        details: result.error || result.output,
        status: 'failed'
      })
      return { success: false, error: result.error }
    }

    logCallback?.({
      projectId: project.id,
      stepId: step.id,
      type: getLogType(step.type),
      message: `Completed: ${step.name}`,
      details: result.output,
      status: 'success'
    })
  }

  return { success: true, pid: finalPid }
}

function getLogType(stepType: DeployStep['type']): DeployLogType {
  switch (stepType) {
    case 'git_clone':
      return 'clone'
    case 'shell':
      return 'install'
    case 'start_service':
      return 'start'
    default:
      return 'install'
  }
}
