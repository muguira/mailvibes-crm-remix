import { supabase } from '@/integrations/supabase/client'
import { syncAllEmails, syncContactEmails, SyncResult } from '@/services/google/emailSyncService'
import { logger } from '@/utils/logger'

export interface SyncWorkerConfig {
  syncIntervalMs: number
  maxConcurrentSyncs: number
  retryAttempts: number
  retryDelayMs: number
}

export interface SyncJob {
  id: string
  userId: string
  emailAccountEmail: string
  type: 'full' | 'contact' | 'incremental'
  contactEmail?: string
  priority: 'high' | 'medium' | 'low'
  scheduledAt: Date
  attempts: number
  lastError?: string
  forceFullSync?: boolean // New: force complete sync ignoring cache
}

/**
 * Email Sync Worker
 * Handles background synchronization of emails from Gmail to database
 */
export class EmailSyncWorker {
  private config: SyncWorkerConfig
  private isRunning = false
  private syncQueue: SyncJob[] = []
  private activeSyncs = new Set<string>()
  private intervalId?: NodeJS.Timeout

  constructor(config: Partial<SyncWorkerConfig> = {}) {
    this.config = {
      syncIntervalMs: config.syncIntervalMs || 5 * 60 * 1000, // 5 minutes
      maxConcurrentSyncs: config.maxConcurrentSyncs || 3,
      retryAttempts: config.retryAttempts || 3,
      retryDelayMs: config.retryDelayMs || 30 * 1000, // 30 seconds
    }
  }

  /**
   * Start the worker
   */
  start() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // Start periodic sync scheduling
    this.intervalId = setInterval(() => {
      this.schedulePeriodicSyncs()
    }, this.config.syncIntervalMs)

    // Process any existing jobs in the queue
    this.processQueue()

    logger.info('Email sync worker started')
  }

  /**
   * Stop the worker
   */
  stop() {
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }

    logger.info('Email sync worker stopped')
  }

  /**
   * Add a sync job to the queue
   */
  addSyncJob(job: Omit<SyncJob, 'id' | 'attempts' | 'scheduledAt'>) {
    const syncJob: SyncJob = {
      ...job,
      id: `${job.type}-${job.userId}-${job.emailAccountEmail}-${Date.now()}`,
      attempts: 0,
      scheduledAt: new Date(),
    }

    // Check if similar job already exists
    const existingJob = this.syncQueue.find(
      j =>
        j.userId === job.userId &&
        j.emailAccountEmail === job.emailAccountEmail &&
        j.type === job.type &&
        j.contactEmail === job.contactEmail,
    )

    if (existingJob) {
      logger.debug('Similar sync job already queued, skipping', {
        jobId: existingJob.id,
      })
      return
    }

    // Add to queue with priority sorting
    this.syncQueue.push(syncJob)
    this.syncQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    logger.debug('Added sync job to queue', {
      jobId: syncJob.id,
      queueSize: this.syncQueue.length,
    })

    // Process queue if not already processing
    if (this.isRunning) {
      this.processQueue()
    }
  }

  /**
   * Schedule periodic syncs for all connected accounts
   */
  private async schedulePeriodicSyncs() {
    try {
      // Get all connected Gmail accounts
      const { data: accounts, error } = await supabase
        .from('email_accounts')
        .select('user_id, email, sync_enabled, last_sync_at')
        .eq('provider', 'gmail')
        .eq('sync_enabled', true)

      if (error) {
        logger.error('Error fetching email accounts for periodic sync:', error)
        return
      }

      if (!accounts || accounts.length === 0) {
        logger.debug('No Gmail accounts found for periodic sync')
        return
      }

      for (const account of accounts) {
        // Check if account needs sync (hasn't been synced in the last interval)
        const lastSync = account.last_sync_at ? new Date(account.last_sync_at) : null
        const now = new Date()
        const timeSinceLastSync = lastSync ? now.getTime() - lastSync.getTime() : Infinity

        if (timeSinceLastSync >= this.config.syncIntervalMs) {
          this.addSyncJob({
            userId: account.user_id,
            emailAccountEmail: account.email,
            type: 'incremental',
            priority: 'medium',
          })
        }
      }
    } catch (error) {
      logger.error('Error scheduling periodic syncs:', error)
    }
  }

  /**
   * Process the sync queue
   */
  private async processQueue() {
    if (!this.isRunning || this.activeSyncs.size >= this.config.maxConcurrentSyncs) {
      return
    }

    const job = this.syncQueue.shift()
    if (!job) {
      return
    }

    // Check if job is already being processed
    if (this.activeSyncs.has(job.id)) {
      return
    }

    this.activeSyncs.add(job.id)

    try {
      await this.executeSync(job)
    } catch (error) {
      logger.error('Error executing sync job:', error)
    } finally {
      this.activeSyncs.delete(job.id)

      // Continue processing queue
      if (this.isRunning && this.syncQueue.length > 0) {
        // Small delay to prevent overwhelming the system
        setTimeout(() => this.processQueue(), 1000)
      }
    }
  }

  /**
   * Execute a sync job
   */
  private async executeSync(job: SyncJob) {
    logger.info('Executing sync job', { jobId: job.id, type: job.type })

    try {
      let result: SyncResult

      switch (job.type) {
        case 'full':
          result = await syncAllEmails(job.userId, job.emailAccountEmail, {
            maxEmails: 100,
          })
          break

        case 'contact':
          if (!job.contactEmail) {
            throw new Error('Contact email required for contact sync')
          }

          result = await syncContactEmails(job.userId, job.emailAccountEmail, job.contactEmail, {
            maxEmails: Infinity, // Full contact history sync - no limits
            forceFullSync: job.forceFullSync || false,
          })
          break

        case 'incremental':
          // For incremental sync, we sync recent emails for all contacts
          result = await syncAllEmails(job.userId, job.emailAccountEmail, {
            maxEmails: 20, // Fewer emails for incremental sync
          })
          break

        default:
          throw new Error(`Unknown sync type: ${job.type}`)
      }

      if (result.success) {
        logger.info('Sync job completed successfully', {
          jobId: job.id,
          emailsSynced: result.emailsSynced,
          emailsCreated: result.emailsCreated,
          emailsUpdated: result.emailsUpdated,
        })

        // Update last sync time
        await this.updateLastSyncTime(job.userId, job.emailAccountEmail)
      } else {
        throw new Error(result.error || 'Sync failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error('Sync job failed', { jobId: job.id, error: errorMessage })

      // Retry logic
      job.attempts++
      job.lastError = errorMessage

      if (job.attempts < this.config.retryAttempts) {
        logger.info('Retrying sync job', {
          jobId: job.id,
          attempt: job.attempts,
        })

        // Add back to queue with delay
        setTimeout(() => {
          if (this.isRunning) {
            this.syncQueue.unshift(job) // Add to front of queue
          }
        }, this.config.retryDelayMs)
      } else {
        logger.error('Sync job failed after max retries', { jobId: job.id })

        // Update account sync status
        await this.updateSyncError(job.userId, job.emailAccountEmail, errorMessage)
      }
    }
  }

  /**
   * Update last sync time for an account
   */
  private async updateLastSyncTime(userId: string, emailAccountEmail: string) {
    try {
      const { error } = await supabase
        .from('email_accounts')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'completed',
          last_sync_error: null,
        })
        .eq('user_id', userId)
        .eq('email', emailAccountEmail)

      if (error) {
        logger.error('Error updating last sync time:', error)
      }
    } catch (error) {
      logger.error('Error updating last sync time:', error)
    }
  }

  /**
   * Update sync error for an account
   */
  private async updateSyncError(userId: string, emailAccountEmail: string, errorMessage: string) {
    try {
      const { error } = await supabase
        .from('email_accounts')
        .update({
          last_sync_status: 'failed',
          last_sync_error: errorMessage,
        })
        .eq('user_id', userId)
        .eq('email', emailAccountEmail)

      if (error) {
        logger.error('Error updating sync error:', error)
      }
    } catch (error) {
      logger.error('Error updating sync error:', error)
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueSize: this.syncQueue.length,
      activeSyncs: this.activeSyncs.size,
      config: this.config,
    }
  }

  /**
   * Get queue contents (for debugging)
   */
  getQueue() {
    return [...this.syncQueue]
  }

  /**
   * Clear the queue
   */
  clearQueue() {
    this.syncQueue = []
    logger.info('Sync queue cleared')
  }
}

// Global worker instance
let globalSyncWorker: EmailSyncWorker | null = null

/**
 * Get or create the global sync worker
 */
export function getSyncWorker(): EmailSyncWorker {
  if (!globalSyncWorker) {
    globalSyncWorker = new EmailSyncWorker()
  }
  return globalSyncWorker
}

/**
 * Start the global sync worker
 */
export function startSyncWorker(config?: Partial<SyncWorkerConfig>) {
  const worker = getSyncWorker()

  if (config) {
    // Update config
    Object.assign(worker['config'], config)
  }

  worker.start()
  return worker
}

/**
 * Stop the global sync worker
 */
export function stopSyncWorker() {
  if (globalSyncWorker) {
    globalSyncWorker.stop()
  }
}

/**
 * Add a sync job to the global worker
 */
export function addSyncJob(job: Omit<SyncJob, 'id' | 'attempts' | 'scheduledAt'>) {
  const worker = getSyncWorker()

  // Auto-start worker if not running
  if (!worker['isRunning']) {
    worker.start()
  }

  worker.addSyncJob(job)
}

/**
 * Trigger immediate sync for a user's account
 */
export function triggerAccountSync(
  userId: string,
  emailAccountEmail: string,
  type: 'full' | 'incremental' = 'incremental',
) {
  addSyncJob({
    userId,
    emailAccountEmail,
    type,
    priority: 'high',
  })
}

/**
 * Trigger immediate sync for a specific contact
 */
export function triggerContactSync(
  userId: string,
  emailAccountEmail: string,
  contactEmail: string,
  options?: { forceFullSync?: boolean },
) {
  addSyncJob({
    userId,
    emailAccountEmail,
    contactEmail,
    type: 'contact',
    priority: 'high',
    forceFullSync: options?.forceFullSync || false,
  })
}
