import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import { platform } from 'os'

const execAsync = promisify(exec)

export interface ProcessInfo {
  pid: number
  command: string
}

export async function killProcess(pid: number): Promise<boolean> {
  return new Promise((resolve) => {
    const isWindows = platform() === 'win32'
    const killCommand = isWindows
      ? `taskkill /PID ${pid} /F /T`
      : `kill -9 ${pid}`

    exec(killCommand, (error) => {
      if (error) {
        console.error(`Failed to kill process ${pid}:`, error)
        resolve(false)
      } else {
        console.log(`Successfully killed process ${pid}`)
        resolve(true)
      }
    })
  })
}

export async function findProcessByPort(port: number): Promise<number | null> {
  return new Promise((resolve) => {
    const isWindows = platform() === 'win32'
    const command = isWindows
      ? `netstat -ano | findstr :${port}`
      : `lsof -ti:${port}`

    exec(command, (error, stdout) => {
      if (error || !stdout) {
        resolve(null)
        return
      }

      if (isWindows) {
        const lines = stdout.trim().split('\n')
        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          const pidStr = parts[parts.length - 1]
          if (pidStr) {
            const pid = parseInt(pidStr)
            if (!isNaN(pid)) {
              resolve(pid)
              return
            }
          }
        }
        resolve(null)
      } else {
        const pid = parseInt(stdout.trim())
        resolve(isNaN(pid) ? null : pid)
      }
    })
  })
}

export function executeCommand(
  command: string,
  cwd?: string,
  env?: Record<string, string>
): { process: ReturnType<typeof spawn>; promise: Promise<{ code: number; output: string }> } {
  const isWindows = platform() === 'win32'
  const shell = isWindows ? 'cmd' : 'sh'
  const shellFlag = isWindows ? '/c' : '-c'

  const child = spawn(shell, [shellFlag, command], {
    cwd,
    env: { ...process.env, ...env },
    detached: !isWindows
  })

  let output = ''

  child.stdout?.on('data', (data) => {
    output += data.toString()
  })

  child.stderr?.on('data', (data) => {
    output += data.toString()
  })

  const promise = new Promise<{ code: number; output: string }>((resolve) => {
    child.on('close', (code) => {
      resolve({ code: code || 0, output })
    })
  })

  return { process: child, promise }
}

export function startService(
  command: string,
  cwd?: string,
  env?: Record<string, string>
): { pid: number; promise: Promise<{ code: number; output: string }> } {
  const isWindows = platform() === 'win32'
  const shell = isWindows ? 'cmd' : 'sh'
  const shellFlag = isWindows ? '/c' : '-c'

  const child = spawn(shell, [shellFlag, command], {
    cwd,
    env: { ...process.env, ...env },
    detached: !isWindows,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let output = ''

  child.stdout?.on('data', (data) => {
    output += data.toString()
    console.log(`[PID ${child.pid}] ${data.toString().trim()}`)
  })

  child.stderr?.on('data', (data) => {
    output += data.toString()
    console.error(`[PID ${child.pid}] ${data.toString().trim()}`)
  })

  const promise = new Promise<{ code: number; output: string }>((resolve) => {
    child.on('close', (code) => {
      resolve({ code: code || 0, output })
    })
  })

  return { pid: child.pid!, promise }
}
