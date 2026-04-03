import type { Project, DeployLog, DeployStep, DomainType } from '../../shared/types/project'

export type { Project, DeployLog, DeployStep, DomainType }

export interface StorageAdapter<T> {
  read(): Promise<T[]>
  write(data: T[]): Promise<void>
  add(item: T): Promise<void>
  update(id: string, item: Partial<T>): Promise<void>
  remove(id: string): Promise<void>
  findById(id: string): Promise<T | undefined>
}
