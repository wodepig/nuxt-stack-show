import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'server', 'data')
const SETTINGS_FILE = join(DATA_DIR, 'settings.json')

export default defineEventHandler(async (event) => {
  const body = await readBody<{ commands: string[] }>(event)
  
  if (!body.commands || !Array.isArray(body.commands)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid commands format'
    })
  }

  try {
    let settings = {}
    try {
      const data = await readFile(SETTINGS_FILE, 'utf-8')
      settings = JSON.parse(data)
    } catch {
      // 文件不存在，使用空对象
    }

    settings = {
      ...settings,
      simplifiedCommands: body.commands
    }

    await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')

    return {
      success: true,
      commands: body.commands
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to save settings'
    })
  }
})
