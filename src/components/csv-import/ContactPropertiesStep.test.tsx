import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ContactPropertiesStep } from './ContactPropertiesStep'
import { ParsedCsvResult } from '@/utils/parseCsv'

// Mock the dnd-kit modules
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  useDroppable: vi.fn(() => ({
    isOver: false,
    setNodeRef: vi.fn(),
  })),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}))

describe('ContactPropertiesStep', () => {
  const mockParsedData: ParsedCsvResult = {
    headers: ['Name', 'Email', 'Phone', 'Company'],
    rows: [
      { Name: 'John Doe', Email: 'john@example.com', Phone: '123-456-7890', Company: 'Acme Inc' },
      { Name: 'Jane Smith', Email: 'jane@example.com', Phone: '098-765-4321', Company: 'Tech Corp' },
    ],
    delimiter: ',',
  }

  const mockOnMappingsChange = vi.fn()
  const mockOnValidationChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render CSV fields and contact property slots', () => {
    render(
      <ContactPropertiesStep
        parsedData={mockParsedData}
        onMappingsChange={mockOnMappingsChange}
        onValidationChange={mockOnValidationChange}
      />,
    )

    // Check CSV fields are displayed
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Phone')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()

    // Check contact property slots are displayed
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
    expect(screen.getByLabelText('Address')).toBeInTheDocument()
    expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument()
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument()
  })

  it('should show required indicators for name and email', () => {
    render(
      <ContactPropertiesStep
        parsedData={mockParsedData}
        onMappingsChange={mockOnMappingsChange}
        onValidationChange={mockOnValidationChange}
      />,
    )

    const requiredFields = screen.getAllByText('*Required')
    expect(requiredFields).toHaveLength(2) // Name and Email
  })

  it('should display live preview with first row data', () => {
    render(
      <ContactPropertiesStep
        parsedData={mockParsedData}
        onMappingsChange={mockOnMappingsChange}
        onValidationChange={mockOnValidationChange}
      />,
    )

    expect(screen.getByText('Example Contact Data')).toBeInTheDocument()
  })

  it('should call validation callback with false initially', () => {
    render(
      <ContactPropertiesStep
        parsedData={mockParsedData}
        onMappingsChange={mockOnMappingsChange}
        onValidationChange={mockOnValidationChange}
      />,
    )

    expect(mockOnValidationChange).toHaveBeenCalledWith(false)
  })

  it('should show empty state when no CSV data', () => {
    const emptyData: ParsedCsvResult = {
      headers: [],
      rows: [],
      delimiter: ',',
    }

    render(
      <ContactPropertiesStep
        parsedData={emptyData}
        onMappingsChange={mockOnMappingsChange}
        onValidationChange={mockOnValidationChange}
      />,
    )

    // Should still render the component structure
    expect(screen.getByText('Import Contact Properties')).toBeInTheDocument()
  })

  it('should display instruction text', () => {
    render(
      <ContactPropertiesStep
        parsedData={mockParsedData}
        onMappingsChange={mockOnMappingsChange}
        onValidationChange={mockOnValidationChange}
      />,
    )

    expect(screen.getByText(/Your organization has a shared list of Contacts/)).toBeInTheDocument()
    expect(screen.getByText(/Drag and drop the fields from your CSV file/)).toBeInTheDocument()
  })

  it('should show "Add another email" link', () => {
    render(
      <ContactPropertiesStep
        parsedData={mockParsedData}
        onMappingsChange={mockOnMappingsChange}
        onValidationChange={mockOnValidationChange}
      />,
    )

    expect(screen.getByText('Add another email')).toBeInTheDocument()
  })
})
