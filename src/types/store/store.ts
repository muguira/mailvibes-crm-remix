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
// import { TGmailAuthStore } from './gmail' // REMOVED: Gmail now has dedicated store
import { TContactProfileStore } from './contact-profile'
import { TEditableLeadsGridStore } from './editable-leads-grid'
import { TEditableOpportunitiesGridStore } from './editable-opportunities-grid'
import { TContactsStore } from './contacts'
import { TOpportunitiesStore } from './opportunities'

// =============================================
// STORE PRINCIPAL DE LA APLICACIÓN
// =============================================

/**
 * Main application store type
 *
 * NOTE: Gmail functionality has been moved to a dedicated store.
 * See src/stores/gmail/gmailStore.ts and src/hooks/gmail/ for Gmail operations.
 */
export type TStore = TTaskStore &
  TAuthStore &
  // TGmailAuthStore & // REMOVED: Gmail now managed separately
  TContactProfileStore &
  TEditableLeadsGridStore &
  TEditableOpportunitiesGridStore &
  TContactsStore &
  TOpportunitiesStore

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
