import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/card';
import { TopNavbar } from '../../components/layout/top-navbar';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState(user?.user_metadata?.firstName || '');
    const [lastName, setLastName] = useState(user?.user_metadata?.lastName || '');
    const [emailSignature, setEmailSignature] = useState('');

    const handleSaveBasicInfo = async () => {
        // TODO: Implement save functionality
    };

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
                                    className="px-4 py-2 text-left rounded-lg bg-accent text-accent-foreground"
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
                                <button
                                    className="px-4 py-2 text-left rounded-lg hover:bg-muted"
                                    onClick={() => navigate('/settings/integrations')}
                                >
                                    Integrations
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <Card className="p-6">
                            <h2 className="text-xl font-semibold mb-6">Basic Information</h2>

                            <div className="space-y-6">
                                <div className="flex items-start gap-6">
                                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                                        <svg
                                            className="w-12 h-12 text-muted-foreground"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                            />
                                        </svg>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        <div>
                                            <label className="block text-sm font-medium mb-1" htmlFor="firstName">
                                                First Name
                                            </label>
                                            <input
                                                type="text"
                                                id="firstName"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-md"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1" htmlFor="lastName">
                                                Last Name
                                            </label>
                                            <input
                                                type="text"
                                                id="lastName"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-md"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium mb-2">Verified Email Addresses</h3>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span>{user?.email}</span>
                                        <span className="text-primary">✓</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-lg font-medium mb-2" htmlFor="emailSignature">
                                        Email Signature
                                    </label>
                                    <textarea
                                        id="emailSignature"
                                        value={emailSignature}
                                        onChange={(e) => setEmailSignature(e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSaveBasicInfo}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </Card>

                        <div className="mt-8 flex items-center justify-between text-sm">
                            <div className="flex gap-4">
                                <a href="#" className="text-accent hover:underline">
                                    Privacy Policy
                                </a>
                                <a href="#" className="text-accent hover:underline">
                                    Terms of Service
                                </a>
                            </div>
                            <button className="text-destructive hover:underline">
                                Delete Your Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Settings; 