import { ActivityItem } from '@/components/list/types'
import { ContactData } from '@/components/list/types'

// Sample data for contacts and their activities
export const contacts: ContactData[] = [
  {
    id: '1',
    name: 'Jack of Trades, Inc.',
    lastActivity: '4h',
    activities: [
      {
        id: '1',
        type: 'update',
        timestamp: '4h',
        content: '',
        user: { name: "Rudy's Admin", initials: 'RA' },
        field: { name: 'Revenue', value: '$10,000' },
      },
      {
        id: '2',
        type: 'note',
        timestamp: '4h',
        content: 'Deal Won!',
        user: { name: 'Rudy Admin', initials: 'RA' },
      },
      {
        id: '3',
        type: 'update',
        timestamp: '4h',
        content: '',
        user: { name: "Rudy's Admin", initials: 'RA' },
        field: { name: 'Close Date', value: 'August 24, 2023' },
      },
      {
        id: '4',
        type: 'update',
        timestamp: '4h',
        content: '',
        user: { name: "Rudy's Admin", initials: 'RA' },
        field: { name: 'Added', value: 'Jack of Trades, Inc.' },
      },
      {
        id: '5',
        type: 'task-complete',
        timestamp: '1mo 15d',
        content: 'Jennifer Raffard marked a follow up task with Jill Trades complete',
        user: { name: 'Jennifer Raffard', initials: 'JR' },
      },
      {
        id: '6',
        type: 'call',
        timestamp: '1mo 24d',
        content: 'Deal going well!',
        user: { name: 'Jennifer Raffard', initials: 'JR' },
      },
    ],
    fields: {
      Status: 'Deal Won',
      Employees: '11-50',
      Revenue: '$10,000',
      'Close Date': 'August 24, 2023',
      Owner: 'Rudy S.',
      'Inactive (days)': '55',
    },
  },
  {
    id: '2',
    name: 'Marina',
    lastActivity: '4h',
    activities: [
      {
        id: '1',
        type: 'update',
        timestamp: '4h',
        content: '',
        user: { name: 'Kelly Singsank', initials: 'KS' },
        field: { name: 'Status', value: 'Qualified' },
      },
    ],
    fields: {
      Status: 'Qualified',
      Revenue: '$3,500',
      'Close Date': 'September 15, 2023',
      Owner: 'Kelly Singsank',
    },
  },
  {
    id: '3',
    name: 'Plane Photos',
    company: 'Aviation Media Inc.',
    lastActivity: '4h',
    activities: [
      {
        id: '1',
        type: 'note',
        timestamp: '4h',
        content: 'Client wants additional features in the package',
        user: { name: 'Rosie Roca', initials: 'RR' },
      },
    ],
    fields: {
      Status: 'Negotiation',
      Revenue: '$12,000',
      'Close Date': 'October 5, 2023',
      Owner: 'Rosie Roca',
    },
  },
  {
    id: '4',
    name: 'Lulu - Product A',
    lastActivity: '5h',
    activities: [
      {
        id: '1',
        type: 'update',
        timestamp: '5h',
        content: '',
        user: { name: 'Kelly Singsank', initials: 'KS' },
        field: { name: 'Revenue', value: '$6,645' },
      },
    ],
    fields: {
      Status: 'Qualified',
      Revenue: '$6,645',
      'Close Date': 'August 13, 2023',
      Owner: 'Kelly Singsank',
    },
  },
  {
    id: '5',
    name: 'Lulu - Product B',
    lastActivity: '5h',
    activities: [],
    fields: {
      Status: 'Deal Won',
      Revenue: '$2,000',
      'Close Date': 'April 6, 2023',
      Owner: 'Rosie Roca',
    },
  },
]
