import { createStorage } from '../../../utils/storage'
import { executeDeploy } from '../../../utils/steps'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { Project, DeployLog } from '../../../types'
import { DEFAULT_SIMPLIFIED_COMMANDS } from '../../settings/simplified-commands.get'

const projectStorage = createStorage<Project>('projects.json')
const logStorage = createStorage<DeployLog>('deploy-logs.json')
const DATA_DIR = join(process.cwd(), 'server', 'data')
const SETTINGS_FILE = join(DATA_DIR, 'settings.json')

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

// 获取简化命令列表
async function getSimplifiedCommands(): Promise<string[]> {
  try {
    const data = await readFile(SETTINGS_FILE, 'utf-8')
    const settings = JSON.parse(data)
    return settings.simplifiedCommands || DEFAULT_SIMPLIFIED_COMMANDS
  } catch {
    return DEFAULT_SIMPLIFIED_COMMANDS
  }
}

// 简化日志内容
function simplifyLogContent(content: string, simplifiedCommands: string[]): string {
  if (!content) return content
  
  const lines = content.split('\n')
  const simplifiedLines: string[] = []
  let isSimplifying = false
  let lastLine = ''
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // 检查是否是简化命令的开始
    const isCommandStart = simplifiedCommands.some(cmd => 
      trimmedLine.includes(cmd) || trimmedLine.startsWith('> ')
    )
    
    if (isCommandStart) {
      // 命令行保留
      simplifiedLines.push(line)
      isSimplifying = true
      continue
    }
    
    // 如果是简化模式，只保留关键信息
    if (isSimplifying) {
      // 保留错误信息
      if (trimmedLine.toLowerCase().includes('error') || 
          trimmedLine.toLowerCase().includes('failed') ||
          trimmedLine.toLowerCase().includes('success') ||
          trimmedLine.toLowerCase().includes('done') ||
          trimmedLine.toLowerCase().includes('complete')) {
        simplifiedLines.push(line)
      }
      // 保留进度信息（百分比）
      else if (trimmedLine.includes('%')) {
        // 只保留最后一条进度
        lastLine = line
      }
      // 空行可能表示命令结束
      else if (trimmedLine === '' && lastLine) {
        simplifiedLines.push(lastLine)
        simplifiedLines.push(line)
        lastLine = ''
        isSimplifying = false
      }
    } else {
      // 非简化模式，保留所有内容
      simplifiedLines.push(line)
    }
  }
  
  // 添加最后一条进度
  if (lastLine) {
    simplifiedLines.push(lastLine)
  }
  
  return simplifiedLines.join('\n').trim()
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  const project = await projectStorage.findById(id)
  
  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Project not found'
    })
  }

  if (project.steps.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No deployment steps configured'
    })
  }

  console.log(`[Deploy] Starting deployment for project: ${project.name} (${id})`)
  await projectStorage.update(id, { status: 'building' })

  // 获取简化命令配置
  const simplifiedCommands = await getSimplifiedCommands()
  console.log(`[Deploy] Simplified commands: ${simplifiedCommands.join(', ')}`)

  const logCallback = async (log: Partial<DeployLog>) => {
    // 简化日志内容
    const simplifiedDetails = log.details 
      ? simplifyLogContent(log.details, simplifiedCommands)
      : undefined

    const fullLog: DeployLog = {
      id: generateId(),
      projectId: id,
      type: log.type || 'install',
      message: log.message || '',
      details: simplifiedDetails,
      status: log.status || 'running',
      createdAt: new Date().toISOString()
    }
    console.log(`[Deploy Log] ${fullLog.status}: ${fullLog.message}`)
    try {
      await logStorage.add(fullLog)
      console.log(`[Deploy Log] Saved log with id: ${fullLog.id}`)
    } catch (e) {
      console.error('[Deploy Log] Failed to save log:', e)
    }
  }

  try {
    const result = await executeDeploy(project, logCallback)

    if (result.success) {
      await projectStorage.update(id, {
        status: 'running',
        pid: result.pid,
        lastUpdatedAt: new Date().toISOString()
      })

      console.log(`[Deploy] Deployment successful, PID: ${result.pid}`)
      return {
        success: true,
        message: 'Deployment completed successfully',
        url: `http://${project.domain}:${project.port}`,
        pid: result.pid
      }
    } else {
      await projectStorage.update(id, {
        status: 'error',
        lastUpdatedAt: new Date().toISOString()
      })

      throw createError({
        statusCode: 500,
        statusMessage: result.error || 'Deployment failed'
      })
    }
  } catch (error) {
    await projectStorage.update(id, {
      status: 'error',
      lastUpdatedAt: new Date().toISOString()
    })

    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Deployment failed'
    })
  }
})
