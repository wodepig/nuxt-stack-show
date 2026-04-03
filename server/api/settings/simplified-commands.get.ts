import { readFile } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'server', 'data')
const SETTINGS_FILE = join(DATA_DIR, 'settings.json')

// 默认简化命令列表
export const DEFAULT_SIMPLIFIED_COMMANDS = [
  'pnpm install',
  'pnpm i',
  'npm install',
  'npm i',
  'pnpm build',
  'npm run build',
  'pnpm dev:prepare',
  'pnpm docs:build',
  'pnpm docs:preview',
  'git clone',
  'git pull'
]

export default defineEventHandler(async () => {
  try {
    const data = await readFile(SETTINGS_FILE, 'utf-8')
    const settings = JSON.parse(data)
    return settings.simplifiedCommands || DEFAULT_SIMPLIFIED_COMMANDS
  } catch {
    return DEFAULT_SIMPLIFIED_COMMANDS
  }
})
