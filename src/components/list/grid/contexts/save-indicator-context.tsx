import React, { createContext, useState, useContext } from 'react'

interface SaveIndicatorContextType {
  showSaveIndicator: { row: string; col: string } | null
  setShowSaveIndicator: (indicator: { row: string; col: string } | null) => void
  triggerSaveIndicator: (rowId: string, colKey: string) => void
}

const SaveIndicatorContext = createContext<SaveIndicatorContextType | null>(null)

export function SaveIndicatorProvider({ children }: { children: React.ReactNode }) {
  const [showSaveIndicator, setShowSaveIndicator] = useState<{ row: string; col: string } | null>(null)

  const triggerSaveIndicator = (rowId: string, colKey: string) => {
    setShowSaveIndicator({ row: rowId, col: colKey })
    setTimeout(() => {
      setShowSaveIndicator(null)
    }, 1000)
  }

  return (
    <SaveIndicatorContext.Provider
      value={{
        showSaveIndicator,
        setShowSaveIndicator,
        triggerSaveIndicator,
      }}
    >
      {children}
    </SaveIndicatorContext.Provider>
  )
}

export function useSaveIndicator() {
  const context = useContext(SaveIndicatorContext)
  if (!context) {
    throw new Error('useSaveIndicator must be used within a SaveIndicatorProvider')
  }
  return context
}
