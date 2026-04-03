import { access } from 'fs/promises'
import { join } from 'path'
import { executeCommand } from './process'

const PROJECTS_DIR = join(process.cwd(), 'projects')

export async function projectExists(projectId: string): Promise<boolean> {
  const projectPath = join(PROJECTS_DIR, projectId)
  try {
    await access(projectPath)
    return true
  } catch {
    return false
  }
}

export async function cloneRepository(
  projectId: string,
  gitUrl: string,
  branch: string = 'main'
): Promise<{ success: boolean; output: string }> {
  const projectPath = join(PROJECTS_DIR, projectId)

  const { promise } = executeCommand(
    `git clone -b ${branch} ${gitUrl} ${projectPath}`,
    PROJECTS_DIR
  )

  const { code, output } = await promise
  return { success: code === 0, output }
}

export async function pullRepository(projectId: string): Promise<{ success: boolean; output: string }> {
  const projectPath = join(PROJECTS_DIR, projectId)

  const { promise } = executeCommand(
    'git pull',
    projectPath
  )

  const { code, output } = await promise
  return { success: code === 0, output }
}

export async function getProjectPath(projectId: string): Promise<string> {
  return join(PROJECTS_DIR, projectId)
}

export async function executeGitStep(
  projectId: string,
  gitUrl: string,
  branch: string = 'main'
): Promise<{ success: boolean; output: string; isNew: boolean }> {
  const exists = await projectExists(projectId)

  if (exists) {
    const result = await pullRepository(projectId)
    return { ...result, isNew: false }
  } else {
    const result = await cloneRepository(projectId, gitUrl, branch)
    return { ...result, isNew: true }
  }
}
