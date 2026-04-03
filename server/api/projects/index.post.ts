import { createStorage } from '../../utils/storage'
import { isPortInUse } from '../../utils/port'
import type { Project, DeployStep } from '../../types'

const projectStorage = createStorage<Project>('projects.json')

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function generateStepId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name: string
    description?: string
    gitUrl: string
    branch?: string
    domain: string
    port: number
    template?: string
    steps?: DeployStep[]
  }>(event)

  if (!body.name || !body.gitUrl || !body.domain || !body.port) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
    })
  }

  const portInUse = await isPortInUse(body.port)
  if (portInUse) {
    throw createError({
      statusCode: 400,
      statusMessage: `Port ${body.port} is already in use`
    })
  }

  let steps: DeployStep[] = []
  if (body.steps && body.steps.length > 0) {
    steps = body.steps.map((step, index) => ({
      ...step,
      id: step.id || generateStepId(),
      order: step.order || index + 1
    }))
  }

  const project: Project = {
    id: generateId(),
    name: body.name,
    description: body.description,
    gitUrl: body.gitUrl,
    branch: body.branch || 'main',
    domain: body.domain,
    port: body.port,
    steps,
    status: 'idle',
    createdAt: new Date().toISOString()
  }

  await projectStorage.add(project)

  return project
})
