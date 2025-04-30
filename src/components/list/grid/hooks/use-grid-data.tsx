
import { useState, useEffect } from "react";

interface UseGridDataProps {
  initialData: any[];
}

export function useGridData({ initialData }: UseGridDataProps) {
  // State for data
  const [data, setData] = useState<any[]>(initialData);
  const [activeCell, setActiveCell] = useState<{ row: string; col: string } | null>(null);
  const [showSaveIndicator, setShowSaveIndicator] = useState<{ row: string; col: string } | null>(null);
  
  // Sync data when initialData changes
  useEffect(() => {
    console.log("initialData updated:", initialData);
    setData(initialData);
  }, [initialData]);

  return {
    data,
    setData,
    activeCell,
    setActiveCell,
    showSaveIndicator,
    setShowSaveIndicator
  };
}
