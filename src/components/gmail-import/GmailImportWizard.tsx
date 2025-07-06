import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stepper, Step } from "@/components/ui/stepper";
import { ArrowRight, ArrowLeft, Check, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth";
import { useStore } from "@/stores";
import { toast } from "sonner";
import { logger } from '@/utils/logger';
import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { Breadcrumb, BreadcrumbItem } from "@/components/ui/breadcrumb";
import { useNavigate } from "react-router-dom";

// Import existing components from CSV import
import { ContactPropertiesStep } from "@/components/csv-import/ContactPropertiesStep";
import { AccountPropertiesStep } from "@/components/csv-import/AccountPropertiesStep";
import { ListFieldsStep } from "@/components/csv-import/ListFieldsStep";
import { ReviewCompleteStep } from "@/components/csv-import/ReviewCompleteStep";
import { MultipleRowsActionModal } from "@/components/csv-import/MultipleRowsActionModal";

// Import Gmail specific components
import { GmailAccountSelectStep } from "./GmailAccountSelectStep";
import { ImportSuccessStep } from "./ImportSuccessStep";

// Import services
import { 
  getAllContactsWithPagination, 
  transformGoogleContactsToCsvFormat 
} from "@/services/google/peopleApi";
import { importCsvData, validateImportData } from "@/services/csvImportService";

// Import types
import { ParsedCsvResult } from "@/utils/parseCsv";
import { FieldMapping } from "@/utils/mapColumnsToContact";
import { AccountFieldMapping } from "@/utils/mapColumnsToAccount";
import { ListFieldDefinition } from "@/utils/buildFieldDefinitions";

const WIZARD_STEPS: Step[] = [
  { id: "account-select", title: "Select Account" },
  { id: "contact-props", title: "Contact Props" },
  { id: "account-props", title: "Account Props" },
  { id: "list-fields", title: "List Fields" },
  { id: "review-complete", title: "Review & Complete" },
  { id: "import-complete", title: "Import Complete" },
];

export interface GmailImportWizardProps {
  onComplete?: (data: ImportData, listId: string | null) => void;
}

export interface ImportData {
  accountEmail: string;
  listName: string;
  relationType: "contacts" | "accounts";
  parsedData: ParsedCsvResult;
  contactFieldMappings: FieldMapping[];
  accountFieldMappings: AccountFieldMapping[];
  listFieldDefinitions: ListFieldDefinition[];
}

export function GmailImportWizard({ onComplete }: GmailImportWizardProps) {
  const { user } = useAuth();
  const { getAccessToken } = useStore();
  const navigate = useNavigate();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string>("");
  const [listName, setListName] = useState("");
  const [relationType, setRelationType] = useState<"contacts" | "accounts">("accounts");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [multipleRowsAction, setMultipleRowsAction] = useState<"multiple" | "merge">("multiple");
  const [showMultipleRowsModal, setShowMultipleRowsModal] = useState(false);
  
  // Import result state
  const [importResult, setImportResult] = useState<{
    contactsCreated: number;
    contactsUpdated: number;
    contactsSkipped: number;
    errors: string[];
    listId: string | null;
  } | null>(null);
  
  // Data states
  const [googleContacts, setGoogleContacts] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<ParsedCsvResult | null>(null);
  const [fetchProgress, setFetchProgress] = useState(0);
  
  // Field mappings for each step
  const [contactFieldMappings, setContactFieldMappings] = useState<FieldMapping[]>([]);
  const [accountFieldMappings, setAccountFieldMappings] = useState<AccountFieldMapping[]>([]);
  const [listFieldDefinitions, setListFieldDefinitions] = useState<ListFieldDefinition[]>([]);
  
  // Validation states
  const [isContactStepValid, setIsContactStepValid] = useState(false);
  const [isAccountStepValid, setIsAccountStepValid] = useState(false);
  const [isListFieldsValid, setIsListFieldsValid] = useState(false);
  
  // Track if we've already fetched contacts for current account
  const fetchedForAccountRef = useRef<string | null>(null);

  // Fetch contacts when account is selected and moving to contact props step
  useEffect(() => {
    const fetchContactsIfNeeded = async () => {
      // Skip if we've already fetched for this account
      if (fetchedForAccountRef.current === selectedAccountEmail) {
        return;
      }
      
      if (currentStep === 1 && selectedAccountId && selectedAccountEmail && !parsedData && user) {
        setIsProcessing(true);
        setFetchProgress(0);
        fetchedForAccountRef.current = selectedAccountEmail;
        
        try {
          // Get access token
          const token = await getAccessToken(user.id, selectedAccountEmail);
          if (!token) {
            throw new Error("Unable to get access token for selected account");
          }

          // Fetch contacts with progress
          const contacts = await getAllContactsWithPagination(
            token,
            (current, total) => {
              const progress = Math.round((current / total) * 100);
              setFetchProgress(progress);
            }
          );

          // Transform to CSV format
          const csvData = transformGoogleContactsToCsvFormat(contacts);
          setParsedData(csvData);
          setGoogleContacts(contacts);
          
          logger.info(`Fetched ${contacts.length} contacts from Gmail`);
        } catch (error) {
          logger.error("Error fetching contacts:", error);
          toast.error("Failed to fetch contacts", {
            description: error instanceof Error ? error.message : "Unknown error occurred",
          });
          // Reset the fetched account ref on error
          fetchedForAccountRef.current = null;
          // Go back to account selection
          setCurrentStep(0);
        } finally {
          setIsProcessing(false);
          setFetchProgress(0);
        }
      }
    };

    fetchContactsIfNeeded();
  }, [currentStep, selectedAccountId, selectedAccountEmail, parsedData, user]); // Remove getAccessToken from dependencies

  const handleAccountSelect = (accountId: string, email: string) => {
    setSelectedAccountId(accountId);
    setSelectedAccountEmail(email);
    // Reset fetched account ref when selecting a new account
    if (email !== fetchedForAccountRef.current) {
      fetchedForAccountRef.current = null;
      setParsedData(null);
      setGoogleContacts([]);
    }
  };

  const canProceedToNext = useCallback(() => {
    switch (currentStep) {
      case 0:
        return selectedAccountId !== null && listName.trim() !== "";
      case 1:
        return isContactStepValid;
      case 2:
        return true; // Account props are optional
      case 3:
        return isListFieldsValid;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedAccountId, listName, isContactStepValid, isListFieldsValid]);

  const handleNext = async () => {
    if (canProceedToNext()) {
      if (currentStep === 4) { // Review step
        // Check if we need to show multiple rows modal
        if (hasMultipleRowsPerAccount() && !showMultipleRowsModal) {
          setShowMultipleRowsModal(true);
        } else {
          await handleCompleteImport();
        }
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
      }
    }
  };

  const hasMultipleRowsPerAccount = () => {
    if (!parsedData || !accountFieldMappings.length) return false;
    
    const accountNameMapping = accountFieldMappings.find(m => m.accountProperty === "name");
    if (!accountNameMapping) return false;
    
    const accountCounts: Record<string, number> = {};
    parsedData.rows.forEach(row => {
      const accountName = row[accountNameMapping.csvField];
      if (accountName) {
        accountCounts[accountName] = (accountCounts[accountName] || 0) + 1;
      }
    });
    
    return Object.values(accountCounts).some(count => count > 1);
  };

  const handleCompleteImport = async () => {
    if (!parsedData || !user) return;

    // Validate data
    const validation = validateImportData(parsedData, contactFieldMappings, listFieldDefinitions);
    if (!validation.isValid) {
      toast.error("Validation failed", {
        description: validation.errors.join(", "),
      });
      return;
    }

    setIsProcessing(true);
    setImportProgress(0);

    try {
      const result = await importCsvData(
        parsedData,
        contactFieldMappings,
        accountFieldMappings,
        listFieldDefinitions,
        listName,
        relationType,
        user.id,
        (progress) => setImportProgress(progress),
        multipleRowsAction
      );

      // Update import result state
      setImportResult(result);
      
      // Advance to the success step
      setCurrentStep(5);
    } catch (error: any) {
      toast.error("Import failed", {
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setIsProcessing(false);
      setImportProgress(0);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleEditStep = (step: number) => {
    setCurrentStep(step);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <GmailAccountSelectStep
            selectedAccountId={selectedAccountId}
            onAccountSelect={handleAccountSelect}
            listName={listName}
            onListNameChange={setListName}
            relationType={relationType}
            onRelationTypeChange={setRelationType}
          />
        );

      case 1:
        return parsedData ? (
          <ContactPropertiesStep
            parsedData={parsedData}
            onMappingsChange={setContactFieldMappings}
            onValidationChange={setIsContactStepValid}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Mail className="w-12 h-12 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Loading contacts from Gmail...</p>
            <div className="w-64 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#62BFAA] h-2 rounded-full transition-all"
                style={{ width: `${fetchProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">{fetchProgress}%</p>
          </div>
        );

      case 2:
        return parsedData ? (
          <AccountPropertiesStep
            parsedData={parsedData}
            onMappingsChange={setAccountFieldMappings}
            onValidationChange={setIsAccountStepValid}
          />
        ) : null;

      case 3:
        return parsedData ? (
          <ListFieldsStep
            parsedData={parsedData}
            accountFieldMappings={accountFieldMappings}
            relationType={relationType}
            onFieldsChange={setListFieldDefinitions}
            onValidationChange={setIsListFieldsValid}
          />
        ) : null;

      case 4:
        return parsedData ? (
          <ReviewCompleteStep
            parsedData={parsedData}
            contactFieldMappings={contactFieldMappings}
            accountFieldMappings={accountFieldMappings}
            listFieldDefinitions={listFieldDefinitions}
            relationType={relationType}
            onEditStep={handleEditStep}
          />
        ) : null;

      case 5:
        return importResult ? (
          <ImportSuccessStep
            contactsCreated={importResult.contactsCreated}
            contactsUpdated={importResult.contactsUpdated}
            contactsSkipped={importResult.contactsSkipped}
            errors={importResult.errors}
            accountEmail={selectedAccountEmail}
            listName={listName}
            onViewContacts={() => {
              if (onComplete) {
                onComplete({
                  accountEmail: selectedAccountEmail,
                  listName,
                  relationType,
                  parsedData: parsedData!,
                  contactFieldMappings,
                  accountFieldMappings,
                  listFieldDefinitions,
                }, importResult.listId);
              }
            }}
          />
        ) : null;

      default:
        return null;
    }
  };

  const shouldShowSkipButton = () => {
    return currentStep === 1 || currentStep === 2;
  };

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: "Settings",
      onClick: () => navigate("/settings")
    },
    {
      label: "Imports",
      onClick: () => navigate("/settings/imports")
    },
    {
      label: "Gmail",
      isActive: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
      <div className="mb-6 bg-white p-4 rounded-lg">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Mail className="w-6 h-6 text-[#62BFAA]" />
            Gmail Import
          </h1>

          <div className="mt-4">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        </div>

        {/* Breadcrumb */}
     
        
       
        <div className="grid grid-cols-12 gap-6">
          {/* Left sidebar with stepper */}
          <div className="col-span-2">
            <Card>
              <div className="bg-[#62BFAA] text-white px-4 py-3 rounded-t-lg">
                <h2 className="text-base font-medium">
                  {currentStep === 5 ? "Import Complete" : WIZARD_STEPS[currentStep]?.title || ""}
                </h2>
              </div>
              <CardContent className="p-4">
                <Stepper
                  steps={WIZARD_STEPS}
                  currentStep={currentStep}
                  orientation="vertical"
                />
              </CardContent>
            </Card>
          </div>

          {/* Main content area */}
          <div className="col-span-10">
            <Card className="relative">
              {/* Loading overlay for import process */}
              <LoadingOverlay
                show={isProcessing && currentStep === 4}
                message={`Importing data... ${importProgress}%`}
              />
              
              <CardContent className="p-6">
                {renderStepContent()}

                {/* Navigation buttons */}
                {currentStep < 5 && (
                  <div className="mt-6 flex justify-between">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentStep === 0 || isProcessing}
                      className={cn(currentStep === 0 && "invisible")}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    
                    <div className="flex gap-2">
                      {shouldShowSkipButton() && (  
                        <Button
                          variant="outline"
                          onClick={handleNext}
                          disabled={isProcessing}
                          className="bg-[#62BFAA] hover:bg-[#52AF9A] text-white"
                        >
                          Skip
                        </Button>
                      )}
                      
                      <Button
                        onClick={handleNext}
                        disabled={!canProceedToNext() || isProcessing}
                        className="bg-[#62BFAA] hover:bg-[#52AF9A] text-white"
                      >
                        {isProcessing && currentStep === 4 ? (
                          <>
                            Importing... {importProgress}%
                          </>
                        ) : currentStep === 4 ? (
                          <>
                            Complete Import
                            <Check className="w-4 h-4 ml-2" />
                          </>
                        ) : (
                          <>
                            Next
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Multiple Rows Action Modal */}
      <MultipleRowsActionModal
        isOpen={showMultipleRowsModal}
        onClose={() => setShowMultipleRowsModal(false)}
        onConfirm={async (action) => {
          setMultipleRowsAction(action);
          setShowMultipleRowsModal(false);
          await handleCompleteImport();
        }}
      />
    </div>
  );
} 