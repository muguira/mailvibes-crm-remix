
import { useState, forwardRef, useImperativeHandle } from "react";
import { PointsOfContactDialog } from "../../dialogs/points-of-contact-dialog";
import { logger } from '@/utils/logger';

interface PointsOfContactDialogContainerProps {
  listId?: string;
  onCellChange?: (rowId: string, colKey: string, value: any) => void;
}

export const PointsOfContactDialogContainer = forwardRef<
  (rowId: string, opportunity: string, company?: string) => void,
  PointsOfContactDialogContainerProps
>(({ listId, onCellChange }, ref) => {
  const [isPointsOfContactOpen, setIsPointsOfContactOpen] = useState(false);
  const [currentOpportunity, setCurrentOpportunity] = useState<{
    id: string;
    name: string;
    company?: string;
  } | null>(null);
  
  // Extract domain from company name
  const getCompanyDomain = (companyName?: string) => {
    if (!companyName) return undefined;
    // Convert company name to a domain-like string
    return companyName.toLowerCase().replace(/\s+/g, '') + '.com';
  };

  // Open Points of Contact dialog for an opportunity
  const openPointsOfContact = (rowId: string, opportunity: string, company?: string) => {
    setCurrentOpportunity({
      id: rowId,
      name: opportunity || 'Opportunity',
      company
    });
    setIsPointsOfContactOpen(true);
  };

  // Expose the openPointsOfContact function through ref
  useImperativeHandle(ref, () => openPointsOfContact);

  // Handle saving contacts
  const handleSaveContacts = (contacts: any[]) => {
    if (!currentOpportunity) return;
    
    // In a real implementation, this would update the opportunity's contacts in the database
    logger.log(`Saved ${contacts.length} contacts for opportunity ${currentOpportunity.name}`);
    
    // Update the primary contact in the grid if needed
    if (contacts.length > 0 && onCellChange) {
      onCellChange(currentOpportunity.id, 'primary_contact', contacts[0].name);
    }
  };
  
  return (
    <>
      {currentOpportunity && listId && (
        <PointsOfContactDialog
          isOpen={isPointsOfContactOpen}
          onClose={() => setIsPointsOfContactOpen(false)}
          listId={listId}
          opportunityId={currentOpportunity.id}
          opportunityName={currentOpportunity.name}
          companyDomain={getCompanyDomain(currentOpportunity.company)}
          onSave={handleSaveContacts}
          initialContacts={[]} // Would be populated from real data in a complete implementation
        />
      )}
    </>
  );
});

PointsOfContactDialogContainer.displayName = "PointsOfContactDialogContainer";
