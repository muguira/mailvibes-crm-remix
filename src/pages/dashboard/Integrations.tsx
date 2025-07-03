import { useState } from 'react';
import { useAuth } from '@/components/auth';
import { Card } from '../../components/ui/card';
import { TopNavbar } from '../../components/layout/top-navbar';
import { Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import integration images
import HubSpotLogo from '../../components/svgs/integrations-images/hubspot-logo.svg';
import MailChimpLogo from '../../components/svgs/integrations-images/mailchimp-logo.svg';
import GoogleSheetsLogo from '../../components/svgs/integrations-images/googlesheet-logo.png';
import CopperLogo from '../../components/svgs/integrations-images/copper-logo.webp';

interface Integration {
    name: string;
    apiKey: string;
    icon: string;
}

interface IntegrationOption {
    name: string;
    description: string;
    icon: string;
    logoComponent?: string;
}

const Integrations = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [existingIntegrations] = useState<Integration[]>([
        {
            name: 'Zapier',
            apiKey: '55c917a3e4b04dc74dd8c94d',
            icon: '🔸' // We'll keep this as is since we don't have a Zapier logo
        }
    ]);

    const integrationOptions: IntegrationOption[] = [
        {
            name: 'HubSpot',
            description: 'Add new leads from HubSpot and update HubSpot contacts with information from RelateIQ to create more targeted marketing campaigns. Requires a HubSpot login.',
            icon: '🔗',
            logoComponent: HubSpotLogo
        },
        {
            name: 'MailChimp',
            description: 'Add new leads from MailChimp and update MailChimp contacts with information from RelateIQ to create more targeted marketing campaigns. Requires a MailChimp login.',
            icon: '📧',
            logoComponent: MailChimpLogo
        },
        {
            name: 'Google Sheets',
            description: 'Sync your contact data with Google Sheets to create custom reports and analyze your data. Import contacts from spreadsheets and keep your data in sync. Requires a Google account.',
            icon: '📝',
            logoComponent: GoogleSheetsLogo
        },
        {
            name: 'Copper',
            description: 'Connect with Copper CRM to synchronize contacts, deals, and activities. Streamline your workflow by keeping both systems up to date automatically. Requires a Copper account.',
            icon: '🔄',
            logoComponent: CopperLogo
        }
    ];

    return (
        <>
            <TopNavbar />
            <div className="container mx-auto px-4 py-8 mt-12">
                <h1 className="text-2xl font-semibold mb-8">Settings</h1>

                <div className="flex gap-8">
                    {/* Sidebar */}
                    <div className="w-64">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium mb-4">My Account Settings</h2>
                            <nav className="flex flex-col space-y-1">
                                <button
                                    className="px-4 py-2 text-left rounded-lg hover:bg-muted"
                                    onClick={() => navigate('/settings')}
                                >
                                    Your Information
                                </button>
                                <button className="px-4 py-2 text-left rounded-lg hover:bg-muted">
                                    Security
                                </button>
                                <button className="px-4 py-2 text-left rounded-lg hover:bg-muted">
                                    Notifications
                                </button>
                                <button className="px-4 py-2 text-left rounded-lg hover:bg-muted">
                                    Connected Accounts
                                </button>
                            </nav>

                            <h2 className="text-lg font-medium mt-8 mb-4">Organization Settings</h2>
                            <nav className="flex flex-col space-y-1">
                                <button className="px-4 py-2 text-left rounded-lg hover:bg-muted">
                                    General
                                </button>
                                <button className="px-4 py-2 text-left rounded-lg hover:bg-muted">
                                    Sharing
                                </button>
                                <button className="px-4 py-2 text-left rounded-lg hover:bg-muted">
                                    Lists
                                </button>
                                <button className="px-4 py-2 text-left rounded-lg hover:bg-muted">
                                    Users
                                </button>
                                <button className="px-4 py-2 text-left rounded-lg hover:bg-muted">
                                    Teams
                                </button>
                                <button className="px-4 py-2 text-left rounded-lg hover:bg-muted">
                                    Billing
                                </button>
                                <button className="px-4 py-2 text-left rounded-lg hover:bg-muted">
                                    Account Properties
                                </button>
                                <button className="px-4 py-2 text-left rounded-lg bg-accent text-accent-foreground">
                                    Integrations
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* API Access Section */}
                        <Card className="p-6 mb-6">
                            <h2 className="text-xl font-semibold mb-4">Trial Account API Access</h2>
                            <p className="text-sm text-gray-600 mb-2">You have used 1 of 5 trial API keys.</p>
                            <p className="text-sm text-gray-600">
                                For additional API keys during your trial, contact{' '}
                                <a href="mailto:success@relateiq.com" className="text-accent hover:underline">
                                    success@relateiq.com
                                </a>
                                . Please note that Custom Integrations are not available in the Starter or Growth plans.
                            </p>
                        </Card>

                        {/* Existing Integrations */}
                        <Card className="p-6 mb-6">
                            <h2 className="text-xl font-semibold mb-4">Existing Integrations</h2>
                            {existingIntegrations.map((integration, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 bg-accent/10 rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl">{integration.icon}</span>
                                        <div>
                                            <h3 className="font-medium">{integration.name}</h3>
                                            <p className="text-sm text-gray-600">API Key: {integration.apiKey}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1 text-sm bg-white border rounded-md hover:bg-gray-50">
                                            <Pencil size={16} className="inline-block mr-1" />
                                            Edit
                                        </button>
                                        <button className="px-3 py-1 text-sm text-white bg-red-500 rounded-md hover:bg-red-600">
                                            <Trash2 size={16} className="inline-block mr-1" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </Card>

                        {/* Create Direct Integration */}
                        <Card className="p-6">
                            <h2 className="text-xl font-semibold mb-6">Create Direct Integration</h2>
                            <div className="space-y-4">
                                {integrationOptions.map((option, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                    >
                                        {option.logoComponent ? (
                                            <img
                                                src={option.logoComponent}
                                                alt={`${option.name} logo`}
                                                className="w-8 h-8 object-contain mt-1"
                                            />
                                        ) : (
                                            <span className="text-2xl mt-1">{option.icon}</span>
                                        )}
                                        <div>
                                            <h3 className="font-medium">{option.name}</h3>
                                            <p className="text-sm text-gray-600">{option.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Integrations; 