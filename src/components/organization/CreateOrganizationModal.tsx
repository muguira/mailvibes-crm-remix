import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Mail, Globe, AlertCircle, Lightbulb } from 'lucide-react';
import { useOrganizationActions, useOrganizationLoadingStates, useOrganizationData } from '@/stores/organizationStore';
import { useAuth } from '@/components/auth';
import { generateOrgNameFromDomain } from '@/utils/unique-id';

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
  const { error: storeError } = useOrganizationData();

  // Auto-suggest organization name based on user's email domain (but don't auto-fill domain)
  React.useEffect(() => {
    if (user?.email && !organizationName) {
      const emailDomain = user.email.split('@')[1];
      
      // Suggest organization name from domain
      // e.g., "questionpro.com" -> "QuestionPro"
      const suggestedName = generateOrgNameFromDomain(emailDomain);
      setOrganizationName(suggestedName);
      
      // Don't auto-fill domain - let user decide if they want to provide it
    }
  }, [user?.email, organizationName]);

  // Update local error when store error changes
  React.useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Simple validation - only organization name is required
    if (!organizationName.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      // Domain is now optional - pass it only if provided
      const domainToUse = domain.trim() || undefined;
      await createOrganization(organizationName.trim(), domainToUse);
      
      // Reset form on success
      setOrganizationName('');
      setDomain('');
      setError(null);
      
      // Close modal if onClose is provided
      if (onClose) {
        onClose();
      }
    } catch (err) {
      // Error is already handled by the store and displayed via storeError
      console.error('Organization creation failed:', err);
    }
  };

  // Handle modal close/skip
  const handleSkip = () => {
    if (onClose) {
      onClose();
    }
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
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              Create an organization to collaborate with your team, or skip to continue with a personal workspace.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="organization-name">Organization Name</Label>
              <Input
                id="organization-name"
                type="text"
                placeholder="e.g., SalesSheet.ai, Acme Corp"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={creatingOrganization}
                className="w-full"
              />
              {user?.email && organizationName && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  Auto-suggested organization name from your email domain
                </p>
              )}
            </div>

            {/* Domain */}
            <div className="space-y-2">
              <Label htmlFor="domain">Organization Domain <span className="text-gray-400 text-sm">(Optional)</span></Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="domain"
                  type="text"
                  placeholder="company.com (optional)"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value.toLowerCase());
                    // Clear error when user changes domain
                    if (error) setError(null);
                  }}
                  disabled={creatingOrganization}
                  className="pl-10 w-full"
                />
              </div>
              <p className="text-xs text-gray-500">
                Optional: Multiple team members can share the same domain. Leave blank to auto-generate.
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
                  You can use any domain for your organization
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1" 
                onClick={handleSkip}
                disabled={creatingOrganization}
              >
                Skip for Now
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={creatingOrganization}
              >
                {creatingOrganization ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4 mr-2" />
                    Create Organization
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="pt-4 border-t">
            <h4 className="font-medium text-sm text-gray-900 mb-2">What happens next?</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• You'll become the organization administrator</li>
              <li>• You can invite team members from any email domain</li>
              <li>• Free plan includes up to 25 members</li>
              <li>• You can change organization details anytime in settings</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 