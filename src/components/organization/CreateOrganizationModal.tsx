import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Mail, Globe, AlertCircle } from 'lucide-react';
import { useOrganizationActions, useOrganizationLoadingStates } from '@/stores/organizationStore';
import { useAuth } from '@/components/auth';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [organizationName, setOrganizationName] = useState('');
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { createOrganization } = useOrganizationActions();
  const { creatingOrganization } = useOrganizationLoadingStates();

  // Pre-fill domain based on user's email
  React.useEffect(() => {
    if (user?.email && !domain) {
      const emailDomain = user.email.split('@')[1];
      setDomain(emailDomain);
    }
  }, [user?.email, domain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!organizationName.trim()) {
      setError('Organization name is required');
      return;
    }

    if (!domain.trim()) {
      setError('Domain is required');
      return;
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      setError('Please enter a valid domain (e.g., company.com)');
      return;
    }

    // Check if user's email domain matches
    if (user?.email) {
      const userDomain = user.email.split('@')[1];
      if (userDomain !== domain.toLowerCase()) {
        setError(`Your email domain (${userDomain}) must match the organization domain`);
        return;
      }
    }

    try {
      await createOrganization(organizationName.trim(), domain.toLowerCase());
      
      // Reset form
      setOrganizationName('');
      setDomain('');
      setError(null);
      
      // Close modal if onClose is provided
      if (onClose) {
        onClose();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getExampleDomain = () => {
    if (user?.email) {
      return user.email.split('@')[1];
    }
    return 'company.com';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Create Your Organization
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to create an organization to continue. Your email domain will determine who can join your organization.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="organization-name">Organization Name</Label>
              <Input
                id="organization-name"
                type="text"
                placeholder="e.g., MailVibes, Acme Corp"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={creatingOrganization}
                className="w-full"
              />
            </div>

            {/* Domain */}
            <div className="space-y-2">
              <Label htmlFor="domain">Organization Domain</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="domain"
                  type="text"
                  placeholder={getExampleDomain()}
                  value={domain}
                  onChange={(e) => setDomain(e.target.value.toLowerCase())}
                  disabled={creatingOrganization}
                  className="pl-10 w-full"
                />
              </div>
              <p className="text-xs text-gray-500">
                Only users with email addresses from this domain can join your organization
              </p>
            </div>

            {/* User Email Info */}
            {user?.email && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Mail className="w-4 h-4" />
                  <span>Your email: {user.email}</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Domain must match: {user.email.split('@')[1]}
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={creatingOrganization}
            >
              {creatingOrganization ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Creating Organization...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Create Organization
                </>
              )}
            </Button>
          </form>

          <div className="pt-4 border-t">
            <h4 className="font-medium text-sm text-gray-900 mb-2">What happens next?</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• You'll become the organization administrator</li>
              <li>• You can invite team members with the same email domain</li>
              <li>• Free plan includes up to 25 members</li>
              <li>• You can upgrade your plan anytime</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 