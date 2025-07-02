import {
  ITaskWithMetadata,
  ITaskLoadingState,
  ITaskErrorState,
  ITaskRetryConfig,
  ITaskFilters,
  ITaskSortOptions,
  ICategorizedTasks,
} from "@/types/store/task";
import { logger } from "@/utils/logger";
import { toast } from "@/hooks/use-toast";

// =============================================
// CONSTANTES DE ESTADO INICIAL
// =============================================

export const INITIAL_TASKS: ITaskWithMetadata[] = [];

export const INITIAL_CATEGORIZED_TASKS: ICategorizedTasks = {
  upcoming: [],
  overdue: [],
  completed: [],
};

export const INITIAL_LOCAL_TASKS: ITaskWithMetadata[] = [];

export const INITIAL_LOADING_STATE: ITaskLoadingState = {
  fetching: false,
  creating: false,
  updating: false,
  deleting: false,
};

export const INITIAL_ERROR_STATE: ITaskErrorState = {
  fetch: null,
  create: null,
  update: null,
  delete: null,
};

export const DEFAULT_RETRY_CONFIG: ITaskRetryConfig = {
  maxAttempts: 3,
  onRetry: (error, attempt) => {
    logger.log(`Retrying task operation (attempt ${attempt})...`);
    if (attempt === 2) {
      toast({
        title: "Connection issues",
        description: "Having trouble with tasks. Retrying...",
        variant: "default",
      });
    }
  },
};

export const INITIAL_FILTERS: ITaskFilters = {};

export const DEFAULT_SORT_OPTIONS: ITaskSortOptions = {
  field: "created_at",
  direction: "desc",
};

export const INITIAL_IS_INITIALIZED = false;

export const INITIAL_LAST_SYNC_AT: string | null = null;

// =============================================
// ESTADO INICIAL COMPLETO
// =============================================

export const INITIAL_TASK_STATE = {
  tasks: INITIAL_TASKS,
  categorizedTasks: INITIAL_CATEGORIZED_TASKS,
  localTasks: INITIAL_LOCAL_TASKS,
  loading: INITIAL_LOADING_STATE,
  errors: INITIAL_ERROR_STATE,
  retryConfig: DEFAULT_RETRY_CONFIG,
  filters: INITIAL_FILTERS,
  sortOptions: DEFAULT_SORT_OPTIONS,
  isInitialized: INITIAL_IS_INITIALIZED,
  lastSyncAt: INITIAL_LAST_SYNC_AT,
} as const;

// =============================================
// CONSTANTES PARA RESET
// =============================================

export const RESET_TASK_STATE = {
  tasks: [],
  categorizedTasks: { upcoming: [], overdue: [], completed: [] },
  localTasks: [],
  loading: {
    fetching: false,
    creating: false,
    updating: false,
    deleting: false,
  },
  errors: { fetch: null, create: null, update: null, delete: null },
  filters: {},
  isInitialized: false,
  lastSyncAt: null,
} as const;
