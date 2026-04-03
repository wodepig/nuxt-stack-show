import { readFile, writeFile, access, mkdir } from 'fs/promises'
import { join } from 'path'
import type { StepTemplate } from '../types'

const DATA_DIR = join(process.cwd(), 'server', 'data')
const TEMPLATE_FILE = join(DATA_DIR, 'templates.json')

// 文件锁，防止并发写入
let currentLock: Promise<unknown> = Promise.resolve()

async function ensureDataDir() {
  try {
    await access(DATA_DIR)
  } catch {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

async function withLock<T>(operation: () => Promise<T>): Promise<T> {
  const lockPromise = currentLock.then(async () => {
    return await operation()
  })
  currentLock = lockPromise.catch(() => Promise.resolve())
  return lockPromise
}

export const templateStorage = {
  async read(): Promise<StepTemplate[]> {
    await ensureDataDir()
    try {
      const data = await readFile(TEMPLATE_FILE, 'utf-8')
      return JSON.parse(data)
    } catch {
      return []
    }
  },

  async write(data: StepTemplate[]): Promise<void> {
    await ensureDataDir()
    await writeFile(TEMPLATE_FILE, JSON.stringify(data, null, 2), 'utf-8')
  },

  async add(item: StepTemplate): Promise<void> {
    return withLock(async () => {
      const data = await this.read()
      data.push(item)
      await this.write(data)
    })
  },

  async update(key: string, updates: Partial<StepTemplate>): Promise<void> {
    return withLock(async () => {
      const data = await this.read()
      const index = data.findIndex(item => item.key === key)
      if (index !== -1) {
        data[index] = { ...data[index], ...updates } as StepTemplate
        await this.write(data)
      }
    })
  },

  async remove(key: string): Promise<void> {
    return withLock(async () => {
      const data = await this.read()
      const filtered = data.filter(item => item.key !== key)
      await this.write(filtered)
    })
  },

  async findByKey(key: string): Promise<StepTemplate | undefined> {
    const data = await this.read()
    return data.find(item => item.key === key)
  }
}
