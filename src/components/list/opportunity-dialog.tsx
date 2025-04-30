
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/custom-button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { v4 as uuidv4 } from 'uuid';

interface Company {
  id: string;
  name: string;
  website: string;
  industry: string;
  size: string;
}

interface OpportunityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; company: string; website?: string }) => void;
  listName: string;
}

export function OpportunityDialog({ isOpen, onClose, onSave, listName }: OpportunityDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Mock companies data - in a real app, this would come from the database
  useEffect(() => {
    const mockCompanies = [
      {
        id: "1",
        name: "Acme Brick",
        website: "www.brick.com",
        industry: "Building Materials",
        size: "1001-5000 employees"
      },
      {
        id: "2",
        name: "Acme Data",
        website: "www.acmedata.net",
        industry: "Computer Software",
        size: "11-50 employees"
      },
      {
        id: "3",
        name: "Acme Packet",
        website: "www.acmepacket.com",
        industry: "Telecommunications",
        size: "501-1000 employees"
      },
      {
        id: "4",
        name: "Acme Distribution",
        website: "www.acmedistribution.com",
        industry: "Warehousing",
        size: "201-500 employees"
      },
      {
        id: "5",
        name: "Acme Alliance, LLC",
        website: "www.acmealliance.com",
        industry: "Mechanical or Industrial Engineering",
        size: "201-500 employees"
      },
      {
        id: "6",
        name: "Acme Smoked Fish Corp",
        website: "www.acmesmokedfish.com",
        industry: "Food & Beverages",
        size: "51-200 employees"
      }
    ];
    setCompanies(mockCompanies);
  }, []);

  // Filter companies based on search term
  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    if (selectedCompany) {
      onSave({
        name: `New Opportunity at ${selectedCompany.name}`,
        company: selectedCompany.name,
        website: selectedCompany.website
      });
    }
    
    // Reset selection after save
    setSelectedCompany(null);
    setSearchTerm("");
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Add an Opportunity - {listName}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-4">
            <label htmlFor="companySearch" className="block text-sm font-medium mb-2">Find or create an account</label>
            <Input
              id="companySearch"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for a company"
              className="w-full"
            />
          </div>

          <div className="border rounded-md max-h-[350px] overflow-y-auto">
            {filteredCompanies.map(company => (
              <div 
                key={company.id} 
                className={`p-3 border-b hover:bg-slate-50 cursor-pointer ${selectedCompany?.id === company.id ? 'bg-slate-100' : ''}`}
                onClick={() => handleSelectCompany(company)}
              >
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <input 
                      type="radio" 
                      checked={selectedCompany?.id === company.id}
                      onChange={() => {}} // Handled by parent div click
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <div className="font-medium">{company.name}</div>
                    <div className="text-sm text-slate-500">{company.website}</div>
                    <div className="text-sm text-slate-500">
                      {company.industry} | {company.size}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredCompanies.length === 0 && (
              <div className="p-4 text-center text-slate-500">
                No companies found. Try a different search term.
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <CustomButton 
            variant="outline" 
            onClick={onClose}
          >
            Cancel
          </CustomButton>
          <div>
            <CustomButton 
              variant="outline" 
              onClick={onClose}
              className="mr-2"
            >
              Change list
            </CustomButton>
            <CustomButton 
              onClick={handleSave}
              disabled={!selectedCompany}
            >
              Add Opportunity
            </CustomButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
