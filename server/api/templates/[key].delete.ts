import { templateStorage } from '../../utils/templateStorage'

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key')

  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Template key is required'
    })
  }

  const template = await templateStorage.findByKey(key)

  if (!template) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Template not found'
    })
  }

  await templateStorage.remove(key)

  return { success: true }
})
