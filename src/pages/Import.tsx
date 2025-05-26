import React from "react";
import { CsvImportWizard, ImportData } from "@/components/csv-import/CsvImportWizard";
import { useNavigate } from "react-router-dom";

export default function Import() {
  const navigate = useNavigate();

  const handleImportComplete = (data: ImportData, listId: string | null) => {
    console.log("Import completed with data:", data);
    console.log("Created list ID:", listId);
    
    // Navigate to the leads page after import
    // The contacts will be shown in the main grid
    setTimeout(() => {
      navigate("/leads");
    }, 1500);
  };

  return <CsvImportWizard onComplete={handleImportComplete} />;
} 