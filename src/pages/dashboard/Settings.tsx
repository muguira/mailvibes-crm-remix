import { useState } from 'react';
import { useAuth } from '@/components/auth';
import { Card } from '../../components/ui/card';
import { TopNavbar } from '../../components/layout/top-navbar';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Settings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [firstName, setFirstName] = useState(user?.user_metadata?.firstName || '');
    const [lastName, setLastName] = useState(user?.user_metadata?.lastName || '');
    const [emailSignature, setEmailSignature] = useState('');

    const isActive = (path: string) => location.pathname === path;

    const handleSaveBasicInfo = async () => {
        // TODO: Implement save functionality
    };

    return (
        <>
            <TopNavbar />
            <div className="min-h-screen bg-gray-50 pt-12">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <h1 className="text-3xl font-semibold mb-8">Settings</h1>

                    <div className="flex gap-8">
                        {/* Sidebar */}
                        <div className="w-64 flex-shrink-0">
                            <div className="bg-white rounded-lg shadow-sm p-4">
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-900 mb-3">My Account Settings</h2>
                                        <nav className="space-y-1">
                                            <button
                                                className={cn(
                                                    "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                                                    isActive('/settings') 
                                                        ? "bg-gray-100 text-gray-900 font-medium" 
                                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                )}
                                                onClick={() => navigate('/settings')}
                                            >
                                                Your Information
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Security
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Notifications
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Connected Accounts
                                            </button>
                                        </nav>
                                    </div>

                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-900 mb-3">Organization Settings</h2>
                                        <nav className="space-y-1">
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                General
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Sharing
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Lists
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Users
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Teams
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Billing
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Account Properties
                                            </button>
                                            <button
                                                className={cn(
                                                    "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                                                    isActive('/settings/integrations') 
                                                        ? "bg-[#E8F5F3] text-[#00A991] font-medium" 
                                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                )}
                                                onClick={() => navigate('/settings/integrations')}
                                            >
                                                Integrations
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1">
                            <Card className="p-6 bg-white shadow-sm">
                                <h2 className="text-xl font-semibold mb-6">Basic Information</h2>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-6">
                                        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                                            <svg
                                                className="w-12 h-12 text-gray-400"
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
                                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="firstName">
                                                    First Name
                                                </label>
                                                <input
                                                    type="text"
                                                    id="firstName"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="lastName">
                                                    Last Name
                                                </label>
                                                <input
                                                    type="text"
                                                    id="lastName"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Verified Email Addresses</h3>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-900">{user?.email}</span>
                                            <span className="text-green-500">✓</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="emailSignature">
                                            Email Signature
                                        </label>
                                        <textarea
                                            id="emailSignature"
                                            value={emailSignature}
                                            onChange={(e) => setEmailSignature(e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter your email signature..."
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSaveBasicInfo}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </Card>

                            <div className="mt-8 flex items-center justify-between text-sm">
                                <div className="flex gap-4">
                                    <a href="#" className="text-blue-600 hover:underline">
                                        Privacy Policy
                                    </a>
                                    <a href="#" className="text-blue-600 hover:underline">
                                        Terms of Service
                                    </a>
                                </div>
                                <button className="text-red-600 hover:underline">
                                    Delete Your Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Settings; 