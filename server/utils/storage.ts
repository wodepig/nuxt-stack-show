import { readFile, writeFile, access, mkdir } from 'fs/promises'
import { join } from 'path'
import type { StorageAdapter } from '../types'

const DATA_DIR = join(process.cwd(), 'server', 'data')

// 文件锁，防止并发写入
const fileLocks = new Map<string, Promise<void>>()

async function ensureDataDir() {
  try {
    await access(DATA_DIR)
  } catch {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

async function withLock<T>(filepath: string, operation: () => Promise<T>): Promise<T> {
  // 等待当前文件的锁释放
  while (fileLocks.has(filepath)) {
    await fileLocks.get(filepath)
  }

  // 创建新的锁
  let resolveLock: () => void
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve
  })
  fileLocks.set(filepath, lockPromise)

  try {
    return await operation()
  } finally {
    fileLocks.delete(filepath)
    resolveLock!()
  }
}

export function createStorage<T extends { id: string }>(filename: string): StorageAdapter<T> {
  const filepath = join(DATA_DIR, filename)

  return {
    async read(): Promise<T[]> {
      await ensureDataDir()
      try {
        const data = await readFile(filepath, 'utf-8')
        return JSON.parse(data)
      } catch {
        return []
      }
    },

    async write(data: T[]): Promise<void> {
      await ensureDataDir()
      await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8')
    },

    async add(item: T): Promise<void> {
      await withLock(filepath, async () => {
        const data = await this.read()
        data.push(item)
        await this.write(data)
      })
    },

    async update(id: string, updates: Partial<T>): Promise<void> {
      await withLock(filepath, async () => {
        const data = await this.read()
        const index = data.findIndex(item => item.id === id)
        if (index !== -1) {
          data[index] = { ...data[index], ...updates } as T
          await this.write(data)
        }
      })
    },

    async remove(id: string): Promise<void> {
      await withLock(filepath, async () => {
        const data = await this.read()
        const filtered = data.filter(item => item.id !== id)
        await this.write(filtered)
      })
    },

    async findById(id: string): Promise<T | undefined> {
      const data = await this.read()
      return data.find(item => item.id === id)
    }
  }
}
