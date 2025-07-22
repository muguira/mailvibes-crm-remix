import { Step } from '@/components/ui/stepper'

/**
 * Configuration for the wizard steps
 */
export const WIZARD_STEPS: Step[] = [
  { id: 'file-select', title: 'Select a File' },
  { id: 'contact-props', title: 'Contact Props' },
  { id: 'account-props', title: 'Account Props' },
  { id: 'list-fields', title: 'List Fields' },
  { id: 'review-complete', title: 'Review & Complete' },
]
