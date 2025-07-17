import React from "react";
import { GmailImportWizard } from "@/components/gmail-import/GmailImportWizard";
import { ImportData } from "@/components/gmail-import/GmailImportWizard";
import { useNavigate } from "react-router-dom";
import { logger } from "@/utils/logger";
import { toast } from "sonner";
import { useAuth } from "@/components/auth";
import { useGmail } from "@/hooks/gmail";
import { ScopeDetectionAlert } from "@/components/gmail-import/ScopeDetectionAlert";
import { ContactsErrorAlert } from "@/components/gmail-import/ContactsErrorAlert";

const GmailImport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { primaryAccount } = useGmail({ autoInitialize: true });

  const handleImportComplete = (data: ImportData, listId: string | null) => {
    logger.debug('[GmailImport] Import completed, navigating to contacts view');
    
    // Dispatch event to notify that contacts were added
    console.log("🚀 DISPATCHING contact-added event from Gmail import");
    const event = new Event('contact-added');
    document.dispatchEvent(event);
    console.log("✅ contact-added event dispatched");
    
    // Show success message
    toast.success("Gmail import completed successfully! Redirecting to contacts...");
    
    // Navigate to the main grid view to see the imported contacts with a delay
    // to ensure the data is refreshed before navigation
    setTimeout(() => {
      console.log("🔄 Navigating to contacts page...");
      navigate("/new-grid");
    }, 1500); // Increased delay to 1.5 seconds
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Scope Detection Alert - Shows before wizard if needed */}
      {user?.id && primaryAccount && (
        <div className="max-w-6xl mx-auto py-4 px-6">
          <ScopeDetectionAlert 
            userId={user.id}
            email={primaryAccount.email}
            onReconnectSuccess={() => {
              toast.success("Cuenta reconectada exitosamente. Todos los permisos están disponibles.")
            }}
          />
        </div>
      )}
      
      <GmailImportWizard onComplete={handleImportComplete} />
    </div>
  );
};

export default GmailImport; 