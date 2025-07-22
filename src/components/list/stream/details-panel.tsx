import { useState } from 'react'
import { Edit, Plus, Check, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CustomButton } from '@/components/ui/custom-button'
import { ContactData } from '../types'

interface DetailsPanelProps {
  selectedContact: ContactData
  onUpdateField?: (field: string, value: any) => void
}

export function DetailsPanel({ selectedContact, onUpdateField }: DetailsPanelProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldValue, setFieldValue] = useState('')
  const [newField, setNewField] = useState({ name: '', value: '' })
  const [isAddingField, setIsAddingField] = useState(false)

  const handleEditField = (field: string, value: any) => {
    setEditingField(field)
    setFieldValue(value)
  }

  const handleSaveField = () => {
    if (!editingField || !onUpdateField) return

    onUpdateField(editingField, fieldValue)
    setEditingField(null)
  }

  const handleAddField = () => {
    if (!newField.name.trim() || !onUpdateField) return

    onUpdateField(newField.name, newField.value)
    setNewField({ name: '', value: '' })
    setIsAddingField(false)
  }

  return (
    <div className="w-72 bg-white">
      <Tabs defaultValue="fields">
        <TabsList className="w-full border-b border-slate-light/30 rounded-none bg-white">
          <TabsTrigger value="fields" className="flex-1">
            Fields
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1">
            Tasks
          </TabsTrigger>
          <TabsTrigger value="sharing" className="flex-1">
            Sharing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="p-0 m-0 overflow-y-auto h-[calc(100vh-112px)]">
          <div className="p-3">
            <input
              type="text"
              placeholder="Filter fields"
              className="px-2 py-1 text-sm border border-slate-light/30 rounded w-full mb-3"
            />

            <div className="space-y-4">
              {selectedContact.fields &&
                Object.entries(selectedContact.fields).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="text-xs text-slate-medium">{key}</div>
                    {editingField === key ? (
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={fieldValue}
                          onChange={e => setFieldValue(e.target.value)}
                          className="w-full p-1 border border-slate-light/30 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-primary"
                          autoFocus
                        />
                        <div className="flex ml-2">
                          <button
                            className="p-1 text-green-500 hover:bg-slate-light/20 rounded"
                            onClick={handleSaveField}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="p-1 text-red-500 hover:bg-slate-light/20 rounded"
                            onClick={() => setEditingField(null)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{String(value)}</div>
                        <button
                          className="text-slate-medium hover:text-teal-primary"
                          onClick={() => handleEditField(key, value)}
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    )}
                    <div className="border-b border-slate-light/30 pt-2"></div>
                  </div>
                ))}

              {isAddingField ? (
                <div className="space-y-2 pt-2">
                  <input
                    type="text"
                    placeholder="Field name"
                    value={newField.name}
                    onChange={e => setNewField({ ...newField, name: e.target.value })}
                    className="w-full p-1 border border-slate-light/30 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-primary"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Field value"
                    value={newField.value}
                    onChange={e => setNewField({ ...newField, value: e.target.value })}
                    className="w-full p-1 border border-slate-light/30 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-primary"
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      className="px-2 py-1 text-xs border border-slate-light/30 rounded hover:bg-slate-light/20"
                      onClick={() => setIsAddingField(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-2 py-1 text-xs bg-teal-primary text-white rounded hover:bg-teal-dark"
                      onClick={handleAddField}
                      disabled={!newField.name.trim()}
                    >
                      Add Field
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <CustomButton
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    size="sm"
                    onClick={() => setIsAddingField(true)}
                  >
                    <Plus size={14} />
                    <span>Add a Field</span>
                  </CustomButton>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="p-3 m-0 overflow-y-auto h-[calc(100vh-112px)]">
          <CustomButton variant="outline" className="w-full flex items-center justify-center gap-2 mb-4" size="sm">
            <Plus size={14} />
            <span>Create Task</span>
          </CustomButton>

          <div className="text-center text-slate-medium py-6">
            <p className="text-sm">No tasks assigned to this contact</p>
          </div>
        </TabsContent>

        <TabsContent value="sharing" className="p-3 m-0 overflow-y-auto h-[calc(100vh-112px)]">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Content Sharing</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm">No past content to share</span>
                <div className="relative inline-block w-10 align-middle select-none">
                  <input type="checkbox" id="toggle" className="hidden" />
                  <label
                    htmlFor="toggle"
                    className="block overflow-hidden h-5 rounded-full bg-slate-light cursor-pointer"
                  >
                    <span className="block h-5 w-5 rounded-full bg-white transform transition-transform duration-200 ease-in"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-light/30 pt-4">
              <h3 className="font-medium mb-2">Email Communication</h3>
              <div className="text-sm text-slate-dark">
                <p>Configure how emails to this contact are tracked and shared with your team.</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
