import React, { useState, useEffect, useRef } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/components/auth'
import { Check, Edit2, X, ExternalLink } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { mockContactsById } from '@/components/stream/sample-data'
import { useActivity } from '@/contexts/ActivityContext'
import { updateContact } from '@/helpers/updateContact'
import { logger } from '@/utils/logger'

interface Contact {
  id: string
  name?: string
  email?: string
  phone?: string
  owner?: string
  lastContacted?: string
  lifecycleStage?: string
  source?: string
  company?: string
  industry?: string
  jobTitle?: string
  address?: string
  description?: string
  facebook?: string
  instagram?: string
  linkedin?: string
  twitter?: string
  website?: string
  associatedDeals?: string
  primaryLocation?: string
  status?: string
  data?: Record<string, any>
  [key: string]: any
}

interface AboutTabProps {
  contact?: Contact
}

export default function AboutTab({ contact }: AboutTabProps) {
  const { user } = useAuth()
  const { logCellEdit } = useActivity()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Partial<Contact>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showAllProperties, setShowAllProperties] = useState(false)
  const editControlRef = useRef<HTMLDivElement>(null)
  const originalValues = useRef<Partial<Contact>>({})
  const lastTapTime = useRef<number>(0)

  // Initialize field values from contact data
  useEffect(() => {
    if (contact) {
      const {
        name = '',
        email = '',
        description = '',
        company = '',
        jobTitle = '',
        industry = '',
        phone = '',
        primaryLocation = '',
        website = '',
        facebook = '',
        instagram = '',
        linkedin = '',
        twitter = '',
        associatedDeals = '',
        owner = user?.email || '',
        lastContacted = '',
        source = '',
        status = '',
        data = {},
      } = contact

      const newValues = {
        name,
        email,
        status,
        description,
        company,
        jobTitle,
        industry,
        phone,
        primaryLocation,
        website,
        facebook,
        instagram,
        linkedin,
        twitter,
        associatedDeals,
        owner,
        lastContacted,
        source,
        ...data,
      }

      setFieldValues(newValues)
      originalValues.current = { ...newValues }
    }
  }, [contact, user])

  // When starting to edit a field, store the original value
  useEffect(() => {
    if (editingField) {
      originalValues.current[editingField] = fieldValues[editingField]
    }
  }, [editingField])

  // Handle field value changes
  const handleFieldChange = (field: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [field]: value }))
  }

  // Handle keyboard events for editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (editingField) {
        saveFieldChange(editingField, fieldValues[editingField])
      }
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  // Handle blur events
  const handleBlur = () => {
    if (editingField) {
      saveFieldChange(editingField, fieldValues[editingField])
    }
  }

  // Cancel editing and restore original value
  const cancelEditing = () => {
    if (editingField) {
      const originalValue = originalValues.current[editingField]
      setFieldValues(prev => ({ ...prev, [editingField]: originalValue }))
      setEditingField(null)
    }
  }

  // Handle tap with double-tap detection
  const handleTap = (field: string) => {
    if (field === 'lastContacted') return // Skip read-only fields

    const currentTime = Date.now()
    const timeDiff = currentTime - lastTapTime.current

    if (timeDiff < 300) {
      // Double tap detected - enter edit mode and select all text
      setEditingField(field)
      setTimeout(() => {
        const input = editControlRef.current?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement
        if (input) {
          input.focus()
          input.select()
        }
      }, 10)
    } else {
      // Single tap - just enter edit mode
      setEditingField(field)
    }

    lastTapTime.current = currentTime
  }

  // Save changes to the database
  const saveFieldChange = async (field: string, value: any) => {
    if (!contact?.id) {
      toast({
        title: 'Error',
        description: 'No contact ID provided',
        variant: 'destructive',
      })
      return
    }

    const oldValue = originalValues.current[field]

    // Skip if value hasn't changed
    if (value === oldValue) {
      setEditingField(null)
      return
    }

    setIsSaving(true)

    try {
      // Update mock contact data for immediate UI feedback
      if (mockContactsById[contact.id]) {
        const updatedContact = { ...mockContactsById[contact.id] }
        updatedContact[field] = value
        mockContactsById[contact.id] = updatedContact

        // Dispatch event to notify other components
        window.dispatchEvent(
          new CustomEvent('mockContactsUpdated', {
            detail: {
              contactId: contact.id,
              field,
              value,
              oldValue,
            },
          }),
        )

        // Log activity
        logCellEdit(contact.id, field, value, oldValue)
      }

      // Save to Supabase
      if (user) {
        const mainFields = ['email', 'phone', 'company', 'source', 'industry', 'jobTitle', 'status', 'website', 'name']

        if (field === 'name') {
          await updateContact({
            id: contact.id,
            user_id: user.id,
            name: value,
          })
        } else if (mainFields.includes(field)) {
          await updateContact({
            id: contact.id,
            user_id: user.id,
            name: contact.name || 'Untitled Contact',
            [field]: value,
          })
        } else {
          const currentData = contact.data || {}
          await updateContact({
            id: contact.id,
            user_id: user.id,
            name: contact.name || 'Untitled Contact',
            data: {
              ...currentData,
              [field]: value,
            },
          })
        }

        toast({
          title: 'Success',
          description: 'Contact updated successfully',
        })
      }
    } catch (error) {
      logger.error('Error saving field:', error)
      toast({
        title: 'Error',
        description: 'Failed to update contact',
        variant: 'destructive',
      })

      // Restore original value on error
      setFieldValues(prev => ({ ...prev, [field]: oldValue }))
    } finally {
      setIsSaving(false)
      setEditingField(null)
    }
  }

  // Render social link with external link icon
  const renderSocialLink = (value: string, label: string) => {
    if (!value) return value
    const url = value.startsWith('http') ? value : `https://${value}`
    return (
      <div className="flex items-center w-full" onClick={e => e.stopPropagation()}>
        <span className="text-[#33B9B0] truncate">{value}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#33B9B0] hover:text-[#2aa39b] ml-1"
          onClick={e => {
            e.stopPropagation()
            window.open(url, '_blank')
          }}
        >
          <ExternalLink size={14} />
        </a>
      </div>
    )
  }

  // Render editable field for mobile
  const renderEditableField = (field: string, label: string, type: string = 'text', options?: string[]) => {
    const value = fieldValues[field] || ''
    const isEditing = editingField === field
    const placeholder = `Set ${label}...`
    const isReadOnly = field === 'lastContacted'
    const isSocialField = ['facebook', 'instagram', 'twitter', 'linkedin', 'website'].includes(field)

    const renderEditControl = () => {
      switch (type) {
        case 'textarea':
          return (
            <Textarea
              value={value}
              onChange={e => handleFieldChange(field, e.target.value)}
              placeholder={placeholder}
              className="min-h-[80px] border-0 border-b border-[#32BAB0] focus:ring-0 px-0 rounded-none text-sm"
              autoFocus
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            />
          )
        case 'select':
          return (
            <Select
              value={value}
              onValueChange={val => {
                handleFieldChange(field, val)
                setTimeout(() => saveFieldChange(field, val), 10)
              }}
              open={true}
            >
              <SelectTrigger
                autoFocus
                className="border-0 border-b border-[#32BAB0] focus:ring-0 px-0 py-0 rounded-none shadow-none text-sm"
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options?.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        default:
          return (
            <Input
              type="text"
              value={value}
              onChange={e => handleFieldChange(field, e.target.value)}
              placeholder={placeholder}
              className="border-0 border-b border-[#32BAB0] focus:ring-0 px-0 py-0 rounded-none text-sm w-full"
              style={{
                boxShadow: 'none',
                lineHeight: 'inherit',
                fontSize: 'inherit',
                fontFamily: 'inherit',
                fontWeight: 'inherit',
                padding: 0,
                margin: 0,
                height: 'auto',
              }}
              autoFocus
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            />
          )
      }
    }

    return (
      <div className="flex flex-col border-b border-slate-light/30 px-4 py-3">
        <span className="text-sm text-slate-medium">{label}</span>

        {isEditing ? (
          <div ref={editControlRef} className="relative mt-1">
            {renderEditControl()}
            <button
              onClick={cancelEditing}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100"
              aria-label="Cancel"
            >
              <X size={16} className="text-[#9ba3af]" />
            </button>
          </div>
        ) : (
          <div
            className={`mt-1 ${!isReadOnly ? 'cursor-text hover:bg-slate-50' : ''} py-1`}
            onClick={() => handleTap(field)}
            style={{
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            }}
          >
            {value ? (
              <div className="break-words text-navy-deep">
                {field === 'lastContacted' && value
                  ? format(new Date(value), 'MMM d, yyyy')
                  : isSocialField
                    ? renderSocialLink(value, label)
                    : value}
              </div>
            ) : (
              <div className="text-slate-light">{isReadOnly ? 'Not set' : placeholder}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Define the condensed fields (13 most important fields for mobile)
  const condensedFields = [
    { id: 'name', label: 'Name', type: 'text' },
    { id: 'email', label: 'Email Address', type: 'email' },
    { id: 'phone', label: 'Phone numbers', type: 'text' },
    {
      id: 'status',
      label: 'Lead Status',
      type: 'select',
      options: ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'],
    },
    { id: 'company', label: 'Company', type: 'text' },
    { id: 'jobTitle', label: 'Job Title', type: 'text' },
    { id: 'industry', label: 'Industry', type: 'text' },
    { id: 'primaryLocation', label: 'Primary location', type: 'text' },
    { id: 'website', label: 'Website', type: 'text' },
    { id: 'description', label: 'Description', type: 'textarea' },
    { id: 'owner', label: 'Owner', type: 'text' },
    { id: 'source', label: 'Source', type: 'text' },
    { id: 'lastContacted', label: 'Last contacted', type: 'text', readOnly: true },
  ]

  // Define all fields (18 fields to match desktop)
  const allFields = [
    { id: 'name', label: 'Name', type: 'text' },
    { id: 'email', label: 'Email Address', type: 'email' },
    {
      id: 'status',
      label: 'Lead Status',
      type: 'select',
      options: ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'],
    },
    { id: 'description', label: 'Description', type: 'textarea' },
    { id: 'company', label: 'Company', type: 'text' },
    { id: 'jobTitle', label: 'Job Title', type: 'text' },
    { id: 'industry', label: 'Industry', type: 'text' },
    { id: 'phone', label: 'Phone numbers', type: 'text' },
    { id: 'primaryLocation', label: 'Primary location', type: 'text' },
    { id: 'website', label: 'Website', type: 'text' },
    { id: 'facebook', label: 'Facebook', type: 'text' },
    { id: 'instagram', label: 'Instagram', type: 'text' },
    { id: 'linkedin', label: 'LinkedIn', type: 'text' },
    { id: 'twitter', label: 'X', type: 'text' },
    { id: 'associatedDeals', label: 'Associated deals', type: 'text' },
    { id: 'owner', label: 'Owner', type: 'text' },
    { id: 'lastContacted', label: 'Last contacted', type: 'text', readOnly: true },
    { id: 'source', label: 'Source', type: 'text' },
  ]

  // Use the appropriate field set based on showAllProperties state
  const fields = showAllProperties ? allFields : condensedFields

  return (
    <div className="flex flex-col">
      <Accordion type="single" collapsible className="w-full" defaultValue="about-contact">
        <AccordionItem value="about-contact" className="border-b">
          <AccordionTrigger className="px-4 py-3">About this contact</AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            {fields.map(field => (
              <div key={field.id}>{renderEditableField(field.id, field.label, field.type, field.options)}</div>
            ))}
            <button
              className="w-full py-4 text-center text-teal-primary hover:underline"
              onClick={() => setShowAllProperties(!showAllProperties)}
            >
              {showAllProperties ? 'Show fewer properties' : 'View all properties'}
            </button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
