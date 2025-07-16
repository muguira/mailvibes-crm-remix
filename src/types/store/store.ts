import {
  ITaskWithMetadata,
  TCreateTaskInput,
  TUpdateTaskInput,
  ITaskFilters,
  ITaskSortOptions,
  ICategorizedTasks,
  TTaskStore,
} from './task'
import { TAuthStore } from './auth'
import { TGmailAuthStore } from './gmail'
import { TContactProfileStore } from './contact-profile'
import { TEditableLeadsGridStore } from './editable-leads-grid'
import { TContactsStore } from './contacts'

// =============================================
// STORE PRINCIPAL DE LA APLICACIÓN
// =============================================

export type TStore = TTaskStore &
  TAuthStore &
  TGmailAuthStore &
  TContactProfileStore &
  TEditableLeadsGridStore &
  TContactsStore

export interface ITask {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
}

// Aliases para mantener compatibilidad temporal con código existente
export type TaskWithMetadata = ITaskWithMetadata
export type CreateTaskInput = TCreateTaskInput
export type UpdateTaskInput = TUpdateTaskInput
export type TaskFilters = ITaskFilters
export type TaskSortOptions = ITaskSortOptions
export type CategorizedTasks = ICategorizedTasks
export type TaskStore = TTaskStore
