import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Landing() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // If user is already authenticated, redirect to dashboard
    if (user) {
        navigate('/dashboard');
        return null;
    }

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
                        <button
                            onClick={() => navigate('/auth')}
                            className="bg-teal-primary hover:bg-teal-primary/90 text-white px-6 py-2 rounded-lg transition-colors"
                        >
                            Sign In
                        </button>
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
            </div>
        </div>
    );
} 