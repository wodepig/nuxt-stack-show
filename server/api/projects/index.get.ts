import { createStorage } from '../../utils/storage'
import type { Project } from '../../types'

const projectStorage = createStorage<Project>('projects.json')

export default defineEventHandler(async () => {
  const projects = await projectStorage.read()
  return projects
})
