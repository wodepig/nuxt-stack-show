import { access, mkdir } from 'fs/promises'
import { join, resolve } from 'path'
import { executeCommand } from './process'

// 使用环境变量或默认路径，支持 Docker 挂载
const PROJECTS_DIR = process.env.PROJECTS_DIR 
  ? resolve(process.env.PROJECTS_DIR)
  : resolve(process.cwd(), 'projects')

// 确保项目目录存在
async function ensureProjectsDir(): Promise<void> {
  try {
    await access(PROJECTS_DIR)
  } catch {
    await mkdir(PROJECTS_DIR, { recursive: true })
  }
}

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
  branch: string = 'main',
  onData?: (data: string) => void
): Promise<{ success: boolean; output: string }> {
  await ensureProjectsDir()
  const projectPath = join(PROJECTS_DIR, projectId)

  // 使用 cross-platform 的 git 命令
  const { promise } = executeCommand(
    `git clone -b "${branch}" "${gitUrl}" "${projectPath}"`,
    PROJECTS_DIR,
    undefined,
    onData
  )

  const { code, output } = await promise
  return { success: code === 0, output }
}

export async function pullRepository(
  projectId: string,
  onData?: (data: string) => void
): Promise<{ success: boolean; output: string }> {
  const projectPath = join(PROJECTS_DIR, projectId)

  const { promise } = executeCommand(
    'git pull',
    projectPath,
    undefined,
    onData
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
  branch: string = 'main',
  onData?: (data: string) => void
): Promise<{ success: boolean; output: string; isNew: boolean }> {
  const exists = await projectExists(projectId)

  if (exists) {
    const result = await pullRepository(projectId, onData)
    return { ...result, isNew: false }
  } else {
    const result = await cloneRepository(projectId, gitUrl, branch, onData)
    return { ...result, isNew: true }
  }
}
