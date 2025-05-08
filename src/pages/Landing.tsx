import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Group6 from '@/components/svgs/Group6.svg';

export default function Landing() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // If user is already authenticated, redirect to dashboard


    return (
        <div className="min-h-screen bg-gradient-to-b from-navy-deep to-navy-light text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Vertical lines */}
                <div className="absolute inset-0" style={{
                    backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 80px)`,
                }}>
                </div>
                {/* Horizontal lines */}
                <div className="absolute inset-0" style={{
                    backgroundImage: `repeating-linear-gradient(to bottom, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 80px)`,
                }}>
                </div>
                {/* Radial gradient overlay */}
                <div className="absolute inset-0" style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(5, 66, 88, 0.3) 0%, rgba(5, 66, 88, 0.1) 70%, transparent 100%)',
                }}>
                </div>
            </div>

            {/* Content */}
            <div className="relative">
                {/* Navigation */}
                <nav className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full border-2 border-teal-primary flex items-center justify-center text-teal-primary text-lg font-bold">
                                S
                            </div>
                            <span className="ml-2 font-semibold text-lg">SalesIQ</span>
                        </div>
                        {user ? (
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="text-gray-300 hover:text-white transition-colors"
                                >
                                    Dashboard
                                </button>
                                <div className="relative group">
                                    <button
                                        className="w-8 h-8 rounded-full bg-teal-primary/20 border border-teal-primary/30 flex items-center justify-center hover:bg-teal-primary/30 transition-colors"
                                        onClick={() => navigate('/dashboard/profile')}
                                    >
                                        <svg className="w-5 h-5 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </button>
                                    <div className="absolute right-0 z-50 top-full mt-2 w-48 py-2 bg-navy-deep backdrop-blur-[2px] border border-white/5 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                        <div className="px-4 py-2 border-b border-white/5">
                                            <p className="text-sm text-white font-medium">{user.email}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/dashboard/profile')}
                                            className="w-full text-left px-4 py-2 text-sm text-white hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            Profile Settings
                                        </button>
                                        <button
                                            onClick={() => navigate('/dashboard')}
                                            className="w-full text-left px-4 py-2 text-sm text-white hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            Dashboard
                                        </button>
                                        <div className="border-t border-white/5 mt-2">
                                            <button
                                                onClick={() => {/* Add your logout handler here */ }}
                                                className="w-full text-left px-4 py-2 text-sm text-white hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate('/auth')}
                                className="bg-teal-primary hover:bg-teal-primary/90 text-white px-6 py-2 rounded-lg transition-colors"
                            >
                                Sign In
                            </button>
                        )}
                    </div>
                </nav>

                {/* Hero Section */}
                <div className="container mx-auto px-6 py-24 text-center">
                    <div className="relative z-10">
                        <h1 className="text-5xl md:text-6xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                            Transform Your Sales Process with{' '}
                            <span className="text-teal-primary">SalesIQ</span>
                        </h1>
                        <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
                            Streamline your sales workflow, manage leads effectively, and close more deals with our intelligent CRM platform.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => navigate('/auth')}
                                className="bg-teal-primary hover:bg-teal-primary/90 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-teal-primary/20"
                            >
                                Get Started
                            </button>
                            <button
                                onClick={() => navigate('/auth')}
                                className="border-2 border-white/20 hover:bg-white/10 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors backdrop-blur-sm"
                            >
                                Schedule Demo
                            </button>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="container mx-auto px-6 py-24 relative z-10">
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="text-center backdrop-blur-sm bg-white/5 rounded-2xl p-8 border border-white/10 hover:border-teal-primary/30 transition-colors">
                            <div className="bg-teal-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Smart Lead Management</h3>
                            <p className="text-gray-300">
                                Intelligently organize and track your leads through every stage of the sales process.
                            </p>
                        </div>
                        <div className="text-center backdrop-blur-sm bg-white/5 rounded-2xl p-8 border border-white/10 hover:border-teal-primary/30 transition-colors">
                            <div className="bg-teal-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Advanced Analytics</h3>
                            <p className="text-gray-300">
                                Get deep insights into your sales performance with powerful analytics tools.
                            </p>
                        </div>
                        <div className="text-center backdrop-blur-sm bg-white/5 rounded-2xl p-8 border border-white/10 hover:border-teal-primary/30 transition-colors">
                            <div className="bg-teal-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Task Automation</h3>
                            <p className="text-gray-300">
                                Automate repetitive tasks and focus on what matters most - closing deals.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Integration Section */}
                <div className="container mx-auto px-6 py-12 md:py-24 relative z-10">
                    <div className="text-center mb-8 md:mb-16">
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                            Seamless Integration Architecture
                        </h2>
                        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
                            Connect and streamline your sales process with our powerful integration capabilities
                        </p>
                    </div>

                    <div className="relative mt-10 md:mt-20">
                        {/* Integration Components */}
                        <div className="relative max-w-6xl mx-auto z-10">
                            {/* Mobile Layout - Stack all components vertically */}
                            <div className="md:hidden flex flex-col gap-6">
                                {/* Frontend */}
                                <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-teal-primary/30 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-teal-primary/20 p-2 rounded-lg">
                                            <svg className="w-6 h-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold">Frontend Client</span>
                                    </div>
                                    <p className="text-sm text-gray-300">Modern React application with real-time updates</p>
                                </div>

                                {/* API Gateway */}
                                <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-teal-primary/30 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-teal-primary/20 p-2 rounded-lg">
                                            <svg className="w-6 h-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold">API Gateway</span>
                                    </div>
                                    <p className="text-sm text-gray-300">Secure and scalable API management</p>
                                </div>

                                {/* Backend Services */}
                                <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-teal-primary/30 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-teal-primary/20 p-2 rounded-lg">
                                            <svg className="w-6 h-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold">Backend Services</span>
                                    </div>
                                    <p className="text-sm text-gray-300">Powerful microservices architecture</p>
                                </div>

                                {/* Database */}
                                <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-teal-primary/30 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-teal-primary/20 p-2 rounded-lg">
                                            <svg className="w-6 h-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm8 13c.8 0 1.5-.7 1.5-1.5S12.8 17 12 17s-1.5.7-1.5 1.5S11.2 20 12 20z" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold">Database</span>
                                    </div>
                                    <p className="text-sm text-gray-300">Reliable and secure data storage</p>
                                </div>
                            </div>

                            {/* Desktop/Tablet Layout - Absolute positioning */}
                            <div className="hidden md:block">
                                {/* Left Side - Frontend */}
                                <div className="absolute left-0 top-0 w-[250px] lg:w-[300px]">
                                    <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-teal-primary/30 transition-all duration-300">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="bg-teal-primary/20 p-2 rounded-lg">
                                                <svg className="w-6 h-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <span className="font-semibold">Frontend Client</span>
                                        </div>
                                        <p className="text-sm text-gray-300">Modern React application with real-time updates</p>
                                    </div>
                                </div>

                                {/* Center - API Gateway */}
                                <div className="absolute left-1/2 top-32 -translate-x-1/2 w-[250px] lg:w-[300px]">
                                    <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-teal-primary/30 transition-all duration-300">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="bg-teal-primary/20 p-2 rounded-lg">
                                                <svg className="w-6 h-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                                </svg>
                                            </div>
                                            <span className="font-semibold">API Gateway</span>
                                        </div>
                                        <p className="text-sm text-gray-300">Secure and scalable API management</p>
                                    </div>
                                </div>

                                {/* Right Side - Backend & Database */}
                                <div className="absolute right-0 z-10 top-[60px] flex flex-col gap-8 w-[250px] lg:w-[300px]">
                                    {/* Backend Services */}
                                    <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-teal-primary/30 transition-all duration-300">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="bg-teal-primary/20 p-2 rounded-lg">
                                                <svg className="w-6 h-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                                </svg>
                                            </div>
                                            <span className="font-semibold">Backend Services</span>
                                        </div>
                                        <p className="text-sm text-gray-300">Powerful microservices architecture</p>
                                    </div>

                                    {/* Database */}
                                    <div className="backdrop-blur-sm bg-white/5 rounded-2xl z-10 relative p-6 border border-white/10 hover:border-teal-primary/30 transition-all duration-300">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="bg-teal-primary/20 p-2 rounded-lg">
                                                <svg className="w-6 h-6 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm8 13c.8 0 1.5-.7 1.5-1.5S12.8 17 12 17s-1.5.7-1.5 1.5S11.2 20 12 20z" />
                                                </svg>
                                            </div>
                                            <span className="font-semibold">Database</span>
                                        </div>
                                        <p className="text-sm text-gray-300">Reliable and secure data storage</p>
                                    </div>
                                </div>

                                {/* Status Indicator */}
                                <div className="absolute z-10 top-0 right-0 flex items-center gap-2 text-sm text-teal-primary bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-teal-primary animate-pulse"></div>
                                    System Status: Operational
                                </div>
                            </div>
                        </div>

                        {/* Connection Lines SVG - Only visible on tablet and up */}
                        <div className="hidden md:block">
                            <img src={Group6} alt="Connection Lines" className="w-[800px] right-[398px] h-full object-contain absolute bottom-[-337px]" />
                        </div>

                        {/* Add height to container to account for absolute positioning */}
                        <div className="h-[400px] md:h-[500px]"></div>
                    </div>
                </div>
            </div>
        </div>
    );
} 