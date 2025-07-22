import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TopNavbar } from '@/components/layout/top-navbar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronDown, Building2, Users, Settings as SettingsIcon } from 'lucide-react';
import { useOrganizationData, useOrganizationActions, useOrganizationLoadingStates } from '@/stores/organizationStore';

interface SettingsLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ 
  children, 
  title = "Settings" 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use organization store data
  const { organization } = useOrganizationData();
  const { loadOrganization } = useOrganizationActions();
  const loadingStates = useOrganizationLoadingStates();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = React.useState(false);

  // Load organization data if not already loaded
  useEffect(() => {
    if (!organization && !loadingStates.loadingOrganization) {
      loadOrganization();
    }
  }, [organization, loadingStates.loadingOrganization, loadOrganization]);

  const isActive = (path: string) => location.pathname === path;

  const accountNavItems = [
    { label: 'Your Information', path: '/settings', icon: null },
    { label: 'Security', path: '/settings/security', icon: null },
    { label: 'Notifications', path: '/settings/notifications', icon: null },
    { label: 'Connected Accounts', path: '/settings/connected-accounts', icon: null },
  ];

  const organizationNavItems = [
    { label: 'General', path: '/settings/organization/general', icon: SettingsIcon },
    { label: 'Sharing', path: '/settings/organization/sharing', icon: null },
    { label: 'Lists', path: '/settings/organization/lists', icon: null },
    { label: 'Users', path: '/settings/organization/users', icon: Users },
    { label: 'Teams', path: '/settings/organization/teams', icon: null },
    { label: 'Billing', path: '/settings/organization/billing', icon: null },
    { label: 'Payment Methods', path: '/settings/organization/payment-methods', icon: null },
    { label: 'Account Properties', path: '/settings/account-properties', icon: null },
    { label: 'Integrations', path: '/settings/integrations', icon: null },
    { label: 'Imports', path: '/settings/imports', icon: null },
  ];

  const handleOrgDropdownToggle = () => {
    setIsOrgDropdownOpen(!isOrgDropdownOpen);
  };

  const renderNavButton = (item: typeof accountNavItems[0]) => {
    const isCurrentActive = isActive(item.path);
    const Icon = item.icon;

    return (
      <button
        key={item.path}
        className={cn(
          "w-full px-3 py-2 text-left text-sm rounded-md transition-colors flex items-center gap-2",
          isCurrentActive
            ? "bg-[#E8F5F3] text-[#00A991] font-medium"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        )}
        onClick={() => navigate(item.path)}
      >
        {Icon && <Icon size={16} />}
        {item.label}
      </button>
    );
  };

  return (
    <>
      <TopNavbar />
      <div className="min-h-screen bg-gray-50 pt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-semibold mb-8">{title}</h1>

          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="space-y-6">
                  {/* My Account Settings */}
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">
                      My Account Settings
                    </h2>
                    <nav className="space-y-1">
                      {accountNavItems.map(renderNavButton)}
                    </nav>
                  </div>

                  {/* Organization Settings */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-gray-900">
                        Organization Settings
                      </h2>
                    </div>

                    {/* Organization Dropdown */}
                    <div className="mb-4">
                      <div className="relative">
                        <button
                          onClick={handleOrgDropdownToggle}
                          className="w-full px-3 py-2 text-left text-sm border border-gray-200 rounded-md hover:border-gray-300 transition-colors flex items-center justify-between bg-white"
                          disabled={loadingStates.loadingOrganization}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-gray-500" />
                            <span className="text-gray-900 font-medium">
                              {loadingStates.loadingOrganization ? 'Loading...' : organization?.name || 'No Organization'}
                            </span>
                          </div>
                          <ChevronDown 
                            size={16} 
                            className={cn(
                              "text-gray-400 transition-transform",
                              isOrgDropdownOpen && "rotate-180"
                            )} 
                          />
                        </button>

                        {/* Dropdown Menu */}
                        {isOrgDropdownOpen && organization && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                            <div className="p-2">
                              <div className="px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Building2 size={16} className="text-gray-500" />
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {organization.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {organization.member_count} members • {organization.plan} plan
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="border-t border-gray-100 mt-2 pt-2">
                                <div className="px-3 py-1 text-xs text-gray-500">
                                  Switch organizations coming soon
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Organization Navigation */}
                    <nav className="space-y-1">
                      {organizationNavItems.map(renderNavButton)}
                    </nav>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}; 