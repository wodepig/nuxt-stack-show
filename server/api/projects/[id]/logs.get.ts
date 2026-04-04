import { logStorage } from '../../../utils/logStorage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  const query = getQuery(event)
  const limit = parseInt(query.limit as string) || 50

  const allLogs = await logStorage.read()
  const projectLogs = allLogs
    .filter(log => log.projectId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)

  return projectLogs
})
