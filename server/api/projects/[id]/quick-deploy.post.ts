import { createStorage } from '../../../utils/storage'
import { logStorage } from '../../../utils/logStorage'
import { addDeployLog } from '../../../utils/deployLogCache'
import { executeStep } from '../../../utils/steps'
import { access } from 'fs/promises'
import { join } from 'path'
import type { Project, DeployLog } from '../../../types'

const projectStorage = createStorage<Project>('projects.json')

const PROJECTS_DIR = process.env.PROJECTS_DIR 
  ? join(process.env.PROJECTS_DIR)
  : join(process.cwd(), 'projects')

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
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

  // 检查快速部署条件
  const projectPath = join(PROJECTS_DIR, id)
  
  try {
    await access(projectPath)
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: '项目目录不存在，请使用完整部署'
    })
  }

  try {
    await access(join(projectPath, 'node_modules'))
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: '依赖未安装，请使用完整部署'
    })
  }

  // 查找 start_service 步骤
  const startStep = project.steps.find(s => s.type === 'start_service')
  if (!startStep) {
    throw createError({
      statusCode: 400,
      statusMessage: '未配置启动服务步骤'
    })
  }

  // 查找 kill_process 步骤
  const killStep = project.steps.find(s => s.type === 'kill_process')

  console.log(`[Quick Deploy] Starting quick deployment for project: ${project.name} (${id})`)
  await projectStorage.update(id, { status: 'building' })

  // 后台执行快速部署
  ;(async () => {
    const logCallback = async (log: Partial<DeployLog>) => {
      const logId = generateId()
      const fullLog: DeployLog = {
        id: logId,
        projectId: id,
        type: log.type || 'start',
        message: log.message || '',
        details: log.details,
        status: log.status || 'running',
        createdAt: new Date().toISOString()
      }
      
      addDeployLog(id, fullLog)
      console.log(`[Quick Deploy Log] ${fullLog.status}: ${fullLog.message}`)
      
      try {
        await logStorage.add(fullLog)
      } catch (e) {
        console.error('[Quick Deploy Log] Failed to save log:', e)
      }
    }

    try {
      // 先执行 kill_process 步骤
      if (killStep) {
        logCallback({
          type: 'stop',
          message: '停止现有服务...',
          status: 'running'
        })
        
        const killResult = await executeStep(killStep, { project, logCallback })
        
        if (!killResult.success) {
          console.log(`[Quick Deploy] Kill process warning: ${killResult.error}`)
        }
      }

      // 执行 start_service 步骤
      logCallback({
        type: 'start',
        message: '启动服务...',
        status: 'running'
      })

      const startResult = await executeStep(startStep, { project, logCallback })

      if (startResult.success) {
        await projectStorage.update(id, {
          status: 'running',
          pid: startResult.pid,
          lastUpdatedAt: new Date().toISOString()
        })

        logCallback({
          type: 'start',
          message: '服务启动成功',
          status: 'success'
        })

        console.log(`[Quick Deploy] Quick deployment successful, PID: ${startResult.pid}`)
      } else {
        await projectStorage.update(id, {
          status: 'error',
          lastUpdatedAt: new Date().toISOString()
        })

        logCallback({
          type: 'error',
          message: `服务启动失败: ${startResult.error}`,
          status: 'failed'
        })

        console.error(`[Quick Deploy] Quick deployment failed: ${startResult.error}`)
      }
    } catch (error) {
      await projectStorage.update(id, {
        status: 'error',
        lastUpdatedAt: new Date().toISOString()
      })

      logCallback({
        type: 'error',
        message: `快速部署错误: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failed'
      })

      console.error('[Quick Deploy] Quick deployment error:', error)
    }
  })()

  return {
    success: true,
    message: 'Quick deployment started',
    projectId: id
  }
})
