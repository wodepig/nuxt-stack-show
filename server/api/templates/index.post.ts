import { templateStorage } from '../../utils/templateStorage'
import type { StepTemplate } from '../../types'

export default defineEventHandler(async (event) => {
  const body = await readBody<StepTemplate>(event)

  if (!body.key || !body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'key and name are required'
    })
  }

  const templates = await templateStorage.read()
  const existing = templates.find(t => t.key === body.key)
  if (existing) {
    throw createError({
      statusCode: 400,
      statusMessage: `Template with key "${body.key}" already exists`
    })
  }

  await templateStorage.add(body)
  return body
})
