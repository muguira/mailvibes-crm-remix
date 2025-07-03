import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Stepper, Step } from "@/components/ui/stepper";
import { parseCsv, isValidCsvFile, ParsedCsvResult } from "@/utils/parseCsv";
import { Upload, FileText, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContactPropertiesStep } from "./ContactPropertiesStep";
import { AccountPropertiesStep } from "./AccountPropertiesStep";
import { ListFieldsStep } from "./ListFieldsStep";
import { ReviewCompleteStep } from "./ReviewCompleteStep";
import { MultipleRowsActionModal } from "./MultipleRowsActionModal";
import { FieldMapping } from "@/utils/mapColumnsToContact";
import { AccountFieldMapping } from "@/utils/mapColumnsToAccount";
import { ListFieldDefinition } from "@/utils/buildFieldDefinitions";
import { importCsvData, validateImportData } from "@/services/csvImportService";
import { useAuth } from "@/components/auth";
import { toast } from "sonner";
import { logger } from '@/utils/logger';
import { LoadingOverlay } from "@/components/ui/loading-spinner";

const WIZARD_STEPS: Step[] = [
  { id: "file-select", title: "Select a File" },
  { id: "contact-props", title: "Contact Props" },
  { id: "account-props", title: "Account Props" },
  { id: "list-fields", title: "List Fields" },
  { id: "review-complete", title: "Review & Complete" },
];

export interface CsvImportWizardProps {
  onComplete?: (data: ImportData, listId: string | null) => void;
}

export interface ImportData {
  file: File;
  listName: string;
  relationType: "contacts" | "accounts";
  parsedData: ParsedCsvResult;
  contactFieldMappings: FieldMapping[];
  accountFieldMappings: AccountFieldMapping[];
  listFieldDefinitions: ListFieldDefinition[];
}

export function CsvImportWizard({ onComplete }: CsvImportWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCsvResult | null>(null);
  const [listName, setListName] = useState("");
  const [relationType, setRelationType] = useState<"contacts" | "accounts">("accounts");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [multipleRowsAction, setMultipleRowsAction] = useState<"multiple" | "merge">("multiple");
  const [showMultipleRowsModal, setShowMultipleRowsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Field mappings for each step
  const [contactFieldMappings, setContactFieldMappings] = useState<FieldMapping[]>([]);
  const [accountFieldMappings, setAccountFieldMappings] = useState<AccountFieldMapping[]>([]);
  const [listFieldDefinitions, setListFieldDefinitions] = useState<ListFieldDefinition[]>([]);
  
  // Validation states
  const [isContactStepValid, setIsContactStepValid] = useState(false);
  const [isAccountStepValid, setIsAccountStepValid] = useState(false);
  const [isListFieldsValid, setIsListFieldsValid] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file || !isValidCsvFile(file.name)) {
      alert("Please upload a valid CSV file");
      return;
    }

    setIsProcessing(true);
    setUploadedFile(file);

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setParsedData(parsed);
      
      // Don't auto-advance - let user click Next
      // if (parsed.headers.length > 0) {
      //   setCurrentStep(1);
      // }
    } catch (error) {
      logger.error("Error parsing CSV:", error);
      alert("Error parsing CSV file. Please check the file format.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const canProceedToNext = useCallback(() => {
    switch (currentStep) {
      case 0:
        return uploadedFile !== null && listName.trim() !== "";
      case 1:
        return isContactStepValid; // Must have name + email mapped
      case 2:
        return true; // Account props are optional, can always proceed
      case 3:
        return isListFieldsValid; // Must have relationship name mapped
      case 4:
        return true; // Review step can always proceed
      default:
        return false;
    }
  }, [currentStep, uploadedFile, listName, isContactStepValid, isAccountStepValid, isListFieldsValid]);

  const handleNext = async () => {
    if (canProceedToNext()) {
      if (currentStep === WIZARD_STEPS.length - 1) {
        // Final step - check if we need to show multiple rows modal
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
    
    // Find the account name mapping
    const accountNameMapping = accountFieldMappings.find(m => m.accountProperty === "name");
    if (!accountNameMapping) return false;
    
    // Count occurrences of each account name
    const accountCounts: Record<string, number> = {};
    parsedData.rows.forEach(row => {
      const accountName = row[accountNameMapping.csvField];
      if (accountName) {
        accountCounts[accountName] = (accountCounts[accountName] || 0) + 1;
      }
    });
    
    // Check if any account appears more than once
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

      // Show success message
      toast.success(`Created ${result.contactsCreated} new contacts${result.contactsUpdated > 0 ? ` and updated ${result.contactsUpdated} existing contacts` : ''}`);

      // Show errors if any
      if (result.errors.length > 0) {
        toast.error(`Some errors occurred: ${result.errors.join(", ")}`);
      }

      // Call onComplete callback
      if (onComplete) {
        onComplete({
          file: uploadedFile!,
          listName,
          relationType,
          parsedData,
          contactFieldMappings,
          accountFieldMappings,
          listFieldDefinitions,
        }, result.listId);
      }
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
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Select a CSV file to upload to RelateIQ
              </h2>
              <p className="text-gray-600 text-sm">
                Your CSV file may be used to import data into contacts, accounts, and/or fields on your new list.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">How to Set up Your CSV</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>The first row must contain the titles for each column</li>
                  <li>Dates formatted as "MM/DD/YYYY"</li>
                </ul>
              </div>

              <p className="text-sm text-gray-600">
                One column of the CSV will map to the Relationship value of the list. This will determine if the list is a Contact or Account based
                list. Rows missing data for the Relationship column will not be imported.
              </p>

              <a href="#" className="text-[#62BFAA] text-sm hover:underline">
                View a sample formatted CSV
              </a>
            </div>

            <div className="space-y-4">
              <Label htmlFor="csv-upload">Import File (CSV)</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive ? "border-[#62BFAA] bg-[#62BFAA]/5" : "border-gray-300 hover:border-gray-400",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleInputChange}
                  className="hidden"
                  id="csv-upload"
                  disabled={isProcessing}
                />
                {uploadedFile ? (
                  <div className="space-y-2">
                    <FileText className="w-12 h-12 mx-auto text-[#62BFAA]" />
                    <p className="text-sm font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {parsedData && `${parsedData.headers.length} columns, ${parsedData.rows.length} rows`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {isDragActive ? "Drop the file here..." : "Choose File or Drop Here"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="list-name">Name a new list where data will be imported</Label>
              <Input
                id="list-name"
                placeholder="My Imported Accounts"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="max-w-md"
              />
            </div>

            <div className="space-y-3">
              <Label>Do the relationships on this list associate with accounts or contacts?</Label>
              <RadioGroup value={relationType} onValueChange={(value) => setRelationType(value as "contacts" | "accounts")}>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="accounts" id="accounts" className="mt-1" />
                  <div>
                    <Label htmlFor="accounts" className="font-normal cursor-pointer">
                      <span className="font-medium">Accounts</span> (e.g. Opportunities, deals, etc.) - Companies or departments within a company
                    </Label>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="contacts" id="contacts" className="mt-1" />
                  <div>
                    <Label htmlFor="contacts" className="font-normal cursor-pointer">
                      <span className="font-medium">Contacts</span> (e.g. Leads, recruits, etc.) - The people with whom you interact on a day-to-day basis
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 1:
        return parsedData ? (
          <ContactPropertiesStep
            parsedData={parsedData}
            onMappingsChange={setContactFieldMappings}
            onValidationChange={setIsContactStepValid}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            No CSV data available
          </div>
        );

      case 2:
        return parsedData ? (
          <AccountPropertiesStep
            parsedData={parsedData}
            onMappingsChange={setAccountFieldMappings}
            onValidationChange={setIsAccountStepValid}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            No CSV data available
          </div>
        );

      case 3:
        return parsedData ? (
          <ListFieldsStep
            parsedData={parsedData}
            accountFieldMappings={accountFieldMappings}
            relationType={relationType}
            onFieldsChange={setListFieldDefinitions}
            onValidationChange={setIsListFieldsValid}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            No CSV data available
          </div>
        );

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
        ) : (
          <div className="text-center py-8 text-gray-500">
            No CSV data available
          </div>
        );

      default:
        return null;
    }
  };

  const shouldShowSkipButton = () => {
    return currentStep === 1 || currentStep === 2;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Import</h1>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Left sidebar with stepper */}
          <div className="col-span-2">
            <Card>
              <CardHeader className="bg-[#62BFAA] text-white">
                <CardTitle className="text-lg font-medium">
                  {WIZARD_STEPS[currentStep].title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
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
                show={isProcessing && currentStep === WIZARD_STEPS.length - 1}
                message={`Importing data... ${importProgress}%`}
              />
              
              <CardContent className="p-8">
                {renderStepContent()}

                {/* Navigation buttons */}
                <div className="mt-8 flex justify-between">
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
                      {isProcessing && currentStep === WIZARD_STEPS.length - 1 ? (
                        <>
                          Importing... {importProgress}%
                        </>
                      ) : currentStep === WIZARD_STEPS.length - 1 ? (
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