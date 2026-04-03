import { createStorage } from '../../../utils/storage'
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

  return project
})
