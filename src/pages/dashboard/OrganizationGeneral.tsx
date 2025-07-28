import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { 
  useOrganizationData, 
  useOrganizationActions,
  useOrganizationLoadingStates,
  useOrganizationErrors
} from '@/stores/organizationStore';
import { toast } from 'sonner';
import { 
  Building2, 
  Save, 
  RefreshCw,
  AlertCircle,
  Globe,
  Shield
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/components/auth';
import { supabase } from '@/integrations/supabase/client';

const OrganizationGeneral: React.FC = () => {
  const { user } = useAuth();
  const { organization } = useOrganizationData();
  const { loadOrganization } = useOrganizationActions();
  const loadingStates = useOrganizationLoadingStates();
  const errors = useOrganizationErrors();

  // Local state for editing
  const [organizationName, setOrganizationName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [userRole, setUserRole] = useState<string>('member');

  // Load organization data on mount - only if needed
  useEffect(() => {
    if (!organization && !loadingStates.loadingOrganization) {
      console.log('🔄 Settings: Loading organization data');
      loadOrganization();
    }
  }, [organization?.id]); // Removed loadingStates dependency to prevent infinite loop

  // Set initial name when organization loads
  useEffect(() => {
    if (organization?.name) {
      setOrganizationName(organization.name);
    }
  }, [organization?.name]);

  // Get user role for permissions
  useEffect(() => {
    const getUserRole = async () => {
      if (!user?.id || !organization?.id) return;

      const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .single();

      if (member) {
        setUserRole(member.role);
      }
    };

    getUserRole();
  }, [user?.id, organization?.id]);

  // Track changes
  useEffect(() => {
    setHasChanges(organization?.name !== organizationName && organizationName.trim() !== '');
  }, [organization?.name, organizationName]);

  const handleSaveChanges = async () => {
    if (!organization || !organizationName.trim()) return;

    setIsSaving(true);

    try {
      // Use RPC function to update organization name safely
      const { data: success, error } = await supabase
        .rpc('update_organization_name', {
          p_organization_id: organization.id,
          p_new_name: organizationName.trim()
        });

      if (error) throw error;

      if (!success) {
        throw new Error('Failed to update organization name');
      }

      // Reload organization data to reflect changes
      await loadOrganization();

      toast.success('Organization name updated successfully');
      setHasChanges(false);

    } catch (error: any) {
      console.error('Error updating organization name:', error);
      toast.error('Failed to update organization name', {
        description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setOrganizationName(organization?.name || '');
    setHasChanges(false);
  };

  // Show loading state
  if (loadingStates.loadingOrganization && !organization) {
    return (
      <SettingsLayout title="Settings">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00A991] mx-auto mb-4"></div>
                <p className="text-gray-600">Loading organization data...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  // Show error state
  if (errors.loadOrganization && !organization) {
    return (
      <SettingsLayout title="Settings">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load organization</h3>
                <p className="text-gray-600 mb-4">{errors.loadOrganization}</p>
                <Button onClick={loadOrganization} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  const canEditOrganization = userRole === 'admin';

  return (
    <SettingsLayout title="Settings">
      <div className="space-y-6">
        {/* Organization Information */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-gray-600" />
              <div>
                <CardTitle className="text-xl">Organization Information</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your organization's basic information
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="organization-name" className="text-sm font-medium">
                  Organization Name
                </Label>
                <div className="space-y-2">
                  <Input
                    id="organization-name"
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Enter organization name"
                    disabled={!canEditOrganization || isSaving}
                    className="max-w-md"
                  />
                  {!canEditOrganization && (
                    <p className="text-xs text-gray-500">
                      Only administrators can edit the organization name
                    </p>
                  )}
                </div>
              </div>

              {/* Domain (Read-only) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Domain
                </Label>
                <div className="flex items-center gap-2 max-w-md">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 font-mono">
                    {organization?.domain}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  The domain cannot be changed after organization creation
                </p>
              </div>

              {/* Plan and Member Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Plan
                  </Label>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 capitalize">
                      {organization?.plan}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Members
                  </Label>
                  <div className="text-gray-900">
                    {organization?.member_count} / {organization?.max_members}
                  </div>
                </div>
              </div>

              {/* Save Actions */}
              {canEditOrganization && (
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <Button
                    onClick={handleSaveChanges}
                    disabled={!hasChanges || isSaving}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleReset}
                    disabled={!hasChanges || isSaving}
                    variant="outline"
                  >
                    Reset
                  </Button>

                  {hasChanges && (
                    <span className="text-xs text-gray-500">
                      You have unsaved changes
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Organization Stats */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Organization Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {organization?.member_count || 0}
                </div>
                <div className="text-sm text-gray-600">Active Members</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {organization?.plan?.toUpperCase() || 'FREE'}
                </div>
                <div className="text-sm text-gray-600">Current Plan</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(((organization?.member_count || 0) / (organization?.max_members || 1)) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Capacity Used</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Notice */}
        {!canEditOrganization && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You are viewing this organization as a {userRole}. 
              Contact an administrator to make changes to organization settings.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </SettingsLayout>
  );
};

export default OrganizationGeneral; 