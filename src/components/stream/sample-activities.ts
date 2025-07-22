export interface StreamActivity {
  id: string
  timestamp: string
  relativeTime: string
  type: 'email' | 'meeting' | 'call' | 'note' | 'task' | 'form' | 'lifecycle' | 'status_update' | 'system'
  user: {
    name: string
    initials: string
  }
  summary: string
  body?: string
  target?: string
  via?: string
  author?: string
  reactions?: { type: string; count: number }[]
}

export const sampleActivities: StreamActivity[] = [
  {
    id: '1',
    timestamp: '2025-05-01T19:01:00',
    relativeTime: '4h',
    type: 'email',
    user: {
      name: 'James McSales',
      initials: 'JM',
    },
    summary: 'James McSales emailed Lauren Robinson',
    body: "Hi Lauren, Great, I'll send over a calendar invite with call details. Best, James",
    via: 'Google Sheets',
  },
  {
    id: '2',
    timestamp: '2025-05-01T13:00:00',
    relativeTime: '1d',
    type: 'meeting',
    user: {
      name: 'James McSales',
      initials: 'JM',
    },
    summary: 'James McSales scheduled a meeting with Lauren Robinson',
    body: 'Techqueria Demo at James to call Lauren 555-123-4567',
    via: 'Google Sheets',
  },
  {
    id: '3',
    timestamp: '2025-04-30T10:30:00',
    relativeTime: '1w',
    type: 'form',
    user: {
      name: 'Alberto Navarro',
      initials: 'AN',
    },
    summary: 'Form submitted',
    body: 'Submitted QP Signup Form',
  },
  {
    id: '4',
    timestamp: '2025-04-30T10:30:00',
    relativeTime: '1w',
    type: 'lifecycle',
    user: {
      name: 'System',
      initials: 'SY',
    },
    summary: 'Lifecycle change',
    body: 'The lifecycle stage was changed to Subscriber',
  },
  {
    id: '5',
    timestamp: '2025-04-30T09:15:00',
    relativeTime: '1w',
    type: 'note',
    user: {
      name: 'Angel Montero',
      initials: 'AM',
    },
    summary: 'Contact created',
    body: 'Initial contact record created from website form submission',
  },
]
