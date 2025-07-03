import { Task } from "../task";

// =============================================
// TIPOS BASE Y INTERFACES AUXILIARES PARA EL ESTADO GLOBAL
// =============================================

// Extender Task con campos específicos del store
export interface ITaskWithMetadata extends Task {
  user_id: string; // Siempre requerido en el store
  created_at?: string;
  updated_at?: string;
}

// Estado de loading para operaciones específicas
export interface ITaskLoadingState {
  fetching: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

// Estado de error para operaciones específicas
export interface ITaskErrorState {
  fetch: string | null;
  create: string | null;
  update: string | null;
  delete: string | null;
}

// Configuración para retry logic
export interface ITaskRetryConfig {
  maxAttempts: number;
  onRetry?: (error: Error, attempt: number) => void;
}

// Filtros para tareas
export interface ITaskFilters {
  status?: Task["display_status"][];
  type?: Task["type"][];
  priority?: Task["priority"][];
  hasDeadline?: boolean;
  contactId?: string;
}

// Opciones de ordenamiento
export interface ITaskSortOptions {
  field: keyof ITaskWithMetadata;
  direction: "asc" | "desc";
}

// Estado de tareas categorizadas
export interface ICategorizedTasks {
  upcoming: ITaskWithMetadata[];
  overdue: ITaskWithMetadata[];
  completed: ITaskWithMetadata[];
}

// Estado de tareas pendientes para actualizaciones optimistas
export interface IPendingTask {
  tempId: string;
  task: ITaskWithMetadata;
  status: "creating" | "updating" | "deleting";
  originalData?: ITaskWithMetadata; // Para rollback en caso de error
}

export interface IPendingTasks {
  [key: string]: IPendingTask;
}

// =============================================
// TIPOS DE ENTRADA Y OPERACIONES
// =============================================

// Datos para crear nueva tarea
export type TCreateTaskInput = Omit<
  ITaskWithMetadata,
  "created_at" | "updated_at" | "user_id"
>;

// Datos para actualizar tarea
export type TUpdateTaskInput = Omit<
  ITaskWithMetadata,
  "created_at" | "updated_at" | "user_id"
>;

// Tipos auxiliares para acciones específicas
export interface ITaskMutationOptions {
  optimistic?: boolean; // Para updates optimistas
  silent?: boolean; // Para evitar toasts
  retry?: boolean; // Para habilitar retry
}

// Resultado de operaciones con metadatos
export interface ITaskOperationResult<T = ITaskWithMetadata> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount?: number;
}

// Configuración específica para cada operación
export interface ITaskOperationConfig {
  showToast: boolean;
  retryOnError: boolean;
  optimisticUpdate: boolean;
}

// =============================================
// ESTADO DE TAREAS
// =============================================

export interface ITaskState {
  // Estado principal
  tasks: ITaskWithMetadata[];
  categorizedTasks: ICategorizedTasks;
  pendingTasks: IPendingTasks;

  // Flags de estado
  isTaskBeingCreated: boolean;

  // Tareas temporales (durante creación)
  localTasks: ITaskWithMetadata[];

  // Estados de carga
  loading: ITaskLoadingState;

  // Estados de error
  errors: ITaskErrorState;

  // Configuración
  retryConfig: ITaskRetryConfig;

  // Filtros y ordenamiento
  filters: ITaskFilters;
  sortOptions: ITaskSortOptions;

  // Flags de estado
  isInitialized: boolean;
  lastSyncAt: string | null;
}

// =============================================
// ACCIONES DE TAREAS
// =============================================

export interface ITaskActions {
  // --- INICIALIZACIÓN ---
  initialize: () => Promise<void>;
  reset: () => void;

  // --- CRUD OPERATIONS ---
  fetchTasks: () => Promise<void>;
  createTask: (task: TCreateTaskInput) => Promise<ITaskWithMetadata>;
  updateTask: (task: TUpdateTaskInput) => Promise<ITaskWithMetadata>;
  deleteTask: (taskId: string) => Promise<void>;

  // --- OPERACIONES DE ESTADO ---
  changeTaskStatus: (
    taskId: string,
    status: Task["display_status"]
  ) => Promise<void>;
  changeTaskDeadline: (
    taskId: string,
    deadline: string | undefined
  ) => Promise<void>;
  markTaskOverdue: (taskId: string) => void;

  // --- TAREAS TEMPORALES (UI OPTIMISTA) ---
  addLocalTask: (task: ITaskWithMetadata) => void;
  removeLocalTask: (taskId: string) => void;
  updateLocalTask: (
    taskId: string,
    updates: Partial<ITaskWithMetadata>
  ) => void;
  clearLocalTasks: () => void;

  // --- UTILIDADES DE CATEGORIZACIÓN ---
  categorizeTasks: () => void;
  checkOverdueTasks: () => void;

  // --- FILTRADO Y ORDENAMIENTO ---
  setFilters: (filters: Partial<ITaskFilters>) => void;
  setSortOptions: (options: ITaskSortOptions) => void;
  getFilteredTasks: () => ITaskWithMetadata[];

  // --- SELECTORS/GETTERS ---
  getTaskById: (taskId: string) => ITaskWithMetadata | undefined;
  getTasksByContact: (contactId: string) => ITaskWithMetadata[];
  getTasksByType: (type: Task["type"]) => ITaskWithMetadata[];
  getUpcomingTasks: () => ITaskWithMetadata[];
  getOverdueTasks: () => ITaskWithMetadata[];
  getCompletedTasks: () => ITaskWithMetadata[];

  // --- ESTADÍSTICAS ---
  getTaskStats: () => {
    total: number;
    upcoming: number;
    overdue: number;
    completed: number;
    byType: Record<Task["type"], number>;
    byPriority: Record<Task["priority"], number>;
  };

  // --- MANEJO DE ERRORES ---
  clearError: (operation: keyof ITaskErrorState) => void;
  clearAllErrors: () => void;

  // --- CONFIGURACIÓN ---
  setRetryConfig: (config: Partial<ITaskRetryConfig>) => void;

  // --- MANEJO DE TAREAS TEMPORALES ---
  setIsTaskBeingCreated: (isCreating: boolean) => void;
}

// =============================================
// STORE COMBINADO DE TAREAS
// =============================================

// Store de tareas que combina estado y acciones
export type TTaskStore = ITaskState & ITaskActions;
