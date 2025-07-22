import { GridView } from './grid/grid-view'
import { StreamView } from './stream-view'
import { CustomButton } from '@/components/ui/custom-button'

interface ListContentProps {
  currentListId: string | null
  viewMode: 'grid' | 'stream'
  listName: string
  listsLoading: boolean
  gridData: any[]
  columns: any[]
  onCellChange: (rowId: string, colKey: string, value: any) => void
  onAddItem: (() => void) | null
  setIsCreateListOpen: (isOpen: boolean) => void
}

export function ListContent({
  currentListId,
  viewMode,
  listName,
  listsLoading,
  gridData,
  columns,
  onCellChange,
  onAddItem,
  setIsCreateListOpen,
}: ListContentProps) {
  if (!currentListId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-lg font-medium text-slate-dark mb-2">
            {listsLoading ? 'Loading lists...' : 'No lists available'}
          </h2>
          {!listsLoading && (
            <CustomButton onClick={() => setIsCreateListOpen(true)} className="mt-2">
              Create your first list
            </CustomButton>
          )}
        </div>
      </div>
    )
  }

  // Process grid data - remove duplicates and ensure IDs
  const uniqueIds = new Set()
  const processedData = (gridData || [])
    .filter(item => {
      if (!item) return false
      const id = item.id || `temp-${Math.random().toString(36)}`
      if (uniqueIds.has(id)) return false
      uniqueIds.add(id)
      return true
    })
    .map(item => ({
      ...item,
      id: item.id || `row-${uniqueIds.size}`,
    }))

  return viewMode === 'grid' ? (
    <GridView
      key="grid-view"
      columns={columns}
      data={processedData}
      listName={listName}
      listType="Opportunity"
      listId={currentListId}
      onCellChange={onCellChange}
      onAddItem={onAddItem}
    />
  ) : (
    <StreamView key="stream-view" contacts={[]} listName={listName} listId={currentListId} />
  )
}
