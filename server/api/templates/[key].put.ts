import { templateStorage } from '../../utils/templateStorage'
import type { StepTemplate } from '../../types'

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

  const body = await readBody<Partial<StepTemplate>>(event)

  // 不允许修改 key
  if (body.key && body.key !== key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot change template key'
    })
  }

  const updates: Partial<StepTemplate> = {
    ...body
  }

  await templateStorage.update(key, updates)

  const updated = await templateStorage.findByKey(key)
  return updated
})
