import { createServer } from 'net'

export function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        server.close()
        resolve(false)
      })
      .listen(port)
  })
}

export async function findAvailablePort(startPort: number, endPort: number = startPort + 100): Promise<number | null> {
  for (let port = startPort; port <= endPort; port++) {
    const inUse = await isPortInUse(port)
    if (!inUse) return port
  }
  return null
}

export async function checkPortStatus(port: number): Promise<{ inUse: boolean; pid?: number }> {
  const inUse = await isPortInUse(port)
  return { inUse }
}
