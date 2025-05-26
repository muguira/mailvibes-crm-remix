# useColumnOperations Hook

A shared React hook that consolidates all column operations for grid/table components, eliminating code duplication across the codebase.

## Benefits

- **DRY Principle**: Write column logic once, use everywhere
- **Type Safety**: Full TypeScript support with proper types
- **Consistency**: All column operations behave the same way across components
- **Protection**: Built-in support for protected columns
- **Activity Tracking**: Automatic logging of all column operations
- **Undo/Redo Ready**: Integrates with history management

## Installation

```typescript
import { useColumnOperations } from '@/hooks/use-column-operations';
```

## Basic Usage

```typescript
const columnOps = useColumnOperations({
  columns,
  setColumns,
  data,
  setData,
  onPersist: (columns) => saveToDatabase(columns),
  protectedColumns: ['id', 'name'],
  onActivityLog: (action, details) => console.log(action, details)
});

// Use the operations
columnOps.renameColumn('email', 'Email Address');
columnOps.deleteColumn('phone');
columnOps.duplicateColumn(columns[0]);
columnOps.sortColumn('name', 'asc');
```

## API Reference

### Hook Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `columns` | `Column[]` | Yes | Current columns array |
| `setColumns` | `React.Dispatch<>` | Yes | State setter for columns |
| `data` | `GridRow[]` | No | Grid data (required for sorting) |
| `setData` | `React.Dispatch<>` | No | State setter for data |
| `onPersist` | `(columns: Column[]) => void` | No | Called after column changes |
| `saveStateToHistory` | `() => void` | No | For undo/redo integration |
| `protectedColumns` | `string[]` | No | Column IDs that can't be deleted |
| `onActivityLog` | `(action, details) => void` | No | Activity tracking callback |

### Returned Operations

#### `renameColumn(columnId: string, newName: string): void`
Renames a column. Protected columns cannot be renamed.

```typescript
columnOps.renameColumn('status', 'Order Status');
```

#### `deleteColumn(columnId: string): boolean`
Deletes a column and its data. Returns `false` if column is protected.

```typescript
const success = columnOps.deleteColumn('temporary_col');
if (!success) {
  alert('Cannot delete protected column');
}
```

#### `duplicateColumn(column: Column): Column | null`
Creates a copy of a column with all its data.

```typescript
const newColumn = columnOps.duplicateColumn(columns[0]);
// Creates "Column Name Copy" with data
```

#### `sortColumn(columnId: string, direction: 'asc' | 'desc'): void`
Sorts all data by the specified column.

```typescript
columnOps.sortColumn('createdAt', 'desc');
```

#### `moveColumn(columnId: string, direction: 'left' | 'right'): boolean`
Moves a column one position left or right.

```typescript
columnOps.moveColumn('email', 'left');
```

#### `moveColumnToIndex(columnId: string, targetIndex: number): void`
Moves a column to a specific index position.

```typescript
columnOps.moveColumnToIndex('status', 0); // Move to first position
```

#### `addColumn(afterColumnId: string, columnData?: Partial<Column>): Column`
Adds a new column after the specified column.

```typescript
const newCol = columnOps.addColumn('name', {
  title: 'Phone Number',
  type: 'text',
  width: 150
});
```

#### `hideColumn(columnId: string): void`
Marks a column as hidden (sets `hidden: true`).

```typescript
columnOps.hideColumn('internalNotes');
```

#### `unhideColumn(columnId: string): void`
Makes a hidden column visible again.

```typescript
columnOps.unhideColumn('internalNotes');
```

#### `reorderColumns(columnIds: string[]): void`
Reorders multiple columns at once.

```typescript
columnOps.reorderColumns(['id', 'name', 'email', 'status']);
```

#### `updateColumnWidth(columnId: string, width: number): void`
Updates the width of a column (minimum 50px).

```typescript
columnOps.updateColumnWidth('description', 300);
```

## Migration Guide

### Before (Duplicate Code)
```typescript
// In Component A
const renameColumn = (id: string, name: string) => {
  setColumns(prev => prev.map(col => 
    col.id === id ? { ...col, title: name } : col
  ));
  persistColumns();
};

// In Component B (same code repeated)
const renameColumn = (id: string, name: string) => {
  setColumns(prev => prev.map(col => 
    col.id === id ? { ...col, title: name } : col
  ));
  saveToLocalStorage();
};
```

### After (Shared Hook)
```typescript
// In any component
const { renameColumn } = useColumnOperations({
  columns,
  setColumns,
  onPersist: persistColumns
});

// Just use it
renameColumn('email', 'Email Address');
```

## Integration Examples

### With Context Menu
```typescript
const handleContextMenu = (columnId: string, action: string) => {
  switch (action) {
    case 'rename':
      const newName = prompt('New name:');
      if (newName) columnOps.renameColumn(columnId, newName);
      break;
    case 'delete':
      if (!columnOps.deleteColumn(columnId)) {
        toast.error('Cannot delete protected column');
      }
      break;
    case 'duplicate':
      const column = columns.find(c => c.id === columnId);
      if (column) columnOps.duplicateColumn(column);
      break;
  }
};
```

### With Drag & Drop
```typescript
const handleDragEnd = (result: DragResult) => {
  if (!result.destination) return;
  
  const columnId = columns[result.source.index].id;
  columnOps.moveColumnToIndex(columnId, result.destination.index);
};
```

### With Undo/Redo
```typescript
const [history, setHistory] = useState<HistoryState[]>([]);

const saveStateToHistory = () => {
  setHistory(prev => [...prev, { columns, data }]);
};

const columnOps = useColumnOperations({
  columns,
  setColumns,
  data,
  setData,
  saveStateToHistory
});
```

## Best Practices

1. **Define Protected Columns**: Always specify which columns shouldn't be deleted
   ```typescript
   protectedColumns: ['id', 'name', 'createdAt']
   ```

2. **Handle Failures**: Check return values for operations that can fail
   ```typescript
   if (!columnOps.deleteColumn(id)) {
     // Show error message
   }
   ```

3. **Log Activities**: Use activity logging for analytics or audit trails
   ```typescript
   onActivityLog: (action, details) => {
     analytics.track(`grid.column.${action}`, details);
   }
   ```

4. **Persist Changes**: Always provide an `onPersist` callback
   ```typescript
   onPersist: async (columns) => {
     await api.saveColumns(columns);
   }
   ```

## TypeScript Types

```typescript
interface Column {
  id: string;
  title: string;
  type?: string;
  width?: number;
  editable?: boolean;
  frozen?: boolean;
  hidden?: boolean;
  options?: string[];
  colors?: Record<string, string>;
}

interface GridRow {
  id: string;
  [key: string]: any;
}
```

## Performance Considerations

- All operations use `useCallback` to prevent unnecessary re-renders
- Batch operations when possible using `reorderColumns`
- The hook doesn't trigger re-renders unless state actually changes

## Future Enhancements

- [ ] Bulk operations (delete/hide multiple columns)
- [ ] Column validation rules
- [ ] Custom column type registry
- [ ] Async operations support
- [ ] Column templates/presets 