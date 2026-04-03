import { createStorage } from '../../../utils/storage'
import { killProcess } from '../../../utils/process'
import type { Project } from '../../../types'

const projectStorage = createStorage<Project>('projects.json')

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

  let killed = false

  if (project.pid) {
    killed = await killProcess(project.pid)
  }

  await projectStorage.update(id, {
    status: killed ? 'idle' : 'error',
    pid: undefined,
    lastUpdatedAt: new Date().toISOString()
  })

  return {
    success: killed,
    message: killed ? 'Service stopped successfully' : 'Failed to stop service'
  }
})
