import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { DeadlinePopup } from './deadline-popup'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/components/auth'
import { Combobox } from '@/components/ui/combobox'
import { useContactSearch } from '@/hooks/use-contact-search'

interface CreateTaskDialogProps {
  onCreateTask: (task: {
    title: string
    deadline?: string
    type: 'follow-up' | 'respond' | 'task'
    tag?: string
    contactId?: string
  }) => void
}

export function CreateTaskDialog({ onCreateTask }: CreateTaskDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [deadline, setDeadline] = React.useState<Date>()
  const [type, setType] = React.useState<'follow-up' | 'respond' | 'task'>('task')
  const [tag, setTag] = React.useState<string>()
  const [contactId, setContactId] = React.useState<string>()
  const { user } = useAuth()
  const { contacts, isLoading, searchContacts } = useContactSearch()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateTask({
      title,
      deadline: deadline?.toISOString(),
      type,
      tag,
      contactId,
    })
    setOpen(false)
    // Reset form
    setTitle('')
    setDeadline(undefined)
    setType('task')
    setTag(undefined)
    setContactId(undefined)
  }

  const contactItems = React.useMemo(
    () =>
      contacts.map(contact => ({
        value: contact.id,
        label: `${contact.name}${contact.company ? ` (${contact.company})` : ''}${contact.email ? ` - ${contact.email}` : ''}`,
      })),
    [contacts],
  )

  const handleSearch = React.useCallback(
    (search: string) => {
      searchContacts(search)
    },
    [searchContacts],
  )

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full text-left text-muted-foreground flex items-center gap-2 py-2 hover:text-foreground transition-colors">
          <Plus size={20} />
          Create task
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create new task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Contact</Label>
              <Combobox
                items={contactItems}
                value={contactId}
                onValueChange={setContactId}
                onSearch={handleSearch}
                placeholder="Search contacts..."
                emptyText={isLoading ? 'Loading contacts...' : 'No contacts found'}
              />
            </div>
            <div className="grid gap-2">
              <Label>Deadline (optional)</Label>
              <DeadlinePopup date={deadline} onSelect={setDeadline}>
                <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                  <span>{deadline ? format(deadline, 'PPP', { locale: es }) : 'Select deadline'}</span>
                </Button>
              </DeadlinePopup>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={type}
                onChange={e => setType(e.target.value as typeof type)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="task">Task</option>
                <option value="follow-up">Follow-up</option>
                <option value="respond">Respond</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tag">Tag (optional)</Label>
              <Input id="tag" value={tag} onChange={e => setTag(e.target.value)} placeholder="e.g. LATAM" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!title}>
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
