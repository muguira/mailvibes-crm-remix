import React from 'react'
import { CsvImportWizard, ImportData } from '@/components/csv-import/CsvImportWizard'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

export default function Import() {
  const navigate = useNavigate()

  const handleImportComplete = (data: ImportData, listId: string | null) => {
    logger.log('Import completed with data:', data)
    logger.log('Created list ID:', listId)

    // Dispatch event to notify that contacts were added
    const event = new Event('contact-added')
    document.dispatchEvent(event)

    // Show success message
    toast.success('Import completed successfully! Redirecting to contacts...')

    // Navigate to the leads page after a longer delay to ensure data loads
    setTimeout(() => {
      navigate('/leads')
    }, 2500) // Increased delay from 1500ms to 2500ms
  }

  return <CsvImportWizard onComplete={handleImportComplete} />
}
