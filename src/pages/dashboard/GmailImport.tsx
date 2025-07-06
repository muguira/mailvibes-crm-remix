import React from "react";
import { GmailImportWizard } from "@/components/gmail-import/GmailImportWizard";
import { ImportData } from "@/components/gmail-import/GmailImportWizard";
import { useNavigate } from "react-router-dom";
import { logger } from "@/utils/logger";

const GmailImport = () => {
  const navigate = useNavigate();

  const handleImportComplete = (data: ImportData, listId: string | null) => {
    logger.debug('[GmailImport] Import completed, navigating to contacts view');
    
    // Navigate to the main grid view to see the imported contacts
    navigate("/new-grid");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GmailImportWizard onComplete={handleImportComplete} />
    </div>
  );
};

export default GmailImport; 