import { createStorage } from '../../../utils/storage'
import { access } from 'fs/promises'
import { join } from 'path'
import type { Project } from '../../../types'

const projectStorage = createStorage<Project>('projects.json')

// 获取项目目录路径
const PROJECTS_DIR = process.env.PROJECTS_DIR 
  ? join(process.env.PROJECTS_DIR)
  : join(process.cwd(), 'projects')

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

  const checks = {
    projectDir: false,
    nodeModules: false,
    buildOutput: false,
    canQuickDeploy: false
  }

  const projectPath = join(PROJECTS_DIR, id)

  // 检查项目目录是否存在
  try {
    await access(projectPath)
    checks.projectDir = true
  } catch {
    return {
      ...checks,
      message: '项目目录不存在，需要完整部署'
    }
  }

  // 检查 node_modules 是否存在
  try {
    await access(join(projectPath, 'node_modules'))
    checks.nodeModules = true
  } catch {
    return {
      ...checks,
      message: '依赖未安装，需要完整部署'
    }
  }

  // 检查构建输出目录是否存在
  // 查找 start_service 步骤的命令，判断构建输出目录
  const startStep = project.steps.find(s => s.type === 'start_service')
  if (startStep?.workingDir) {
    try {
      const buildPath = join(projectPath, startStep.workingDir)
      await access(buildPath)
      checks.buildOutput = true
    } catch {
      return {
        ...checks,
        message: '构建输出目录不存在，需要完整部署'
      }
    }
  } else {
    // 如果没有指定 workingDir，假设构建输出已存在
    checks.buildOutput = true
  }

  // 所有检查通过
  checks.canQuickDeploy = checks.projectDir && checks.nodeModules && checks.buildOutput

  return {
    ...checks,
    message: checks.canQuickDeploy ? '可以进行快速部署' : '需要完整部署'
  }
})
