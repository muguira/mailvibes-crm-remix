import { useState } from 'react'

interface UseHistoryProps {
  columns: any[]
  data: any[]
}

export function useHistory({ columns, data }: UseHistoryProps) {
  const [undoStack, setUndoStack] = useState<{ columns: any[]; data: any[] }[]>([])
  const [redoStack, setRedoStack] = useState<{ columns: any[]; data: any[] }[]>([])

  // Save current state to history for undo functionality
  const saveStateToHistory = () => {
    setUndoStack(prev => [...prev, { columns: [...columns], data: [...data] }])
    setRedoStack([])
  }

  // Handle keyboard shortcuts for undo/redo
  const handleKeyDown = (e: React.KeyboardEvent, handleUndo: () => void, handleRedo: () => void) => {
    // Check for Ctrl+Z (Undo) and Ctrl+Y (Redo)
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        // Undo operation
        e.preventDefault()
        handleUndo()
      } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
        // Redo operation
        e.preventDefault()
        handleRedo()
      }
    }
  }

  return {
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    saveStateToHistory,
    handleKeyDown,
  }
}
