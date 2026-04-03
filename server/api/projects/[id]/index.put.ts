import { createStorage } from '../../../utils/storage'
import { isPortInUse } from '../../../utils/port'
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

  const existingProject = await projectStorage.findById(id)
  
  if (!existingProject) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Project not found'
    })
  }

  const body = await readBody<Partial<Project>>(event)

  if (body.port && body.port !== existingProject.port) {
    const portInUse = await isPortInUse(body.port)
    if (portInUse) {
      throw createError({
        statusCode: 400,
        statusMessage: `Port ${body.port} is already in use`
      })
    }
  }

  const updates: Partial<Project> = {
    ...body,
    lastUpdatedAt: new Date().toISOString()
  }

  await projectStorage.update(id, updates)

  const updatedProject = await projectStorage.findById(id)
  return updatedProject
})
