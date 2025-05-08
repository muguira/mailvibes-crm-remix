import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Group6 from '@/components/svgs/Group6.svg';
import ContactScreen from '@/images/contact-screen.png';
import Screenshot1 from '@/images/screen1.png';
import Screenshot2 from '@/images/screen2.png';
import Screenshot3 from '@/images/screen3.png';
import Screenshot4 from '@/images/screen4.png';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export default function Landing() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    // Refs for scroll animations
    const firstImageRef = useRef(null);
    const secondSectionRef = useRef(null);

    // Scroll animations
    const { scrollYProgress } = useScroll({
        target: firstImageRef,
        offset: ["start end", "end start"]
    });

    // Transform values for the first image
    const firstImageY = useTransform(scrollYProgress, [0, 1], [100, -100]);
    const firstImageScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);
    const firstImageOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.6, 1, 1, 0.6]);

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

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
                        <div className="flex items-center space-x-8">
                            <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full border-2 border-teal-primary flex items-center justify-center text-teal-primary text-lg font-bold">
                                    S
                                </div>
                                <span className="ml-2 font-semibold text-lg">SalesIQ</span>
                            </div>
                            <div className="hidden md:flex items-center space-x-8">
                                <button
                                    onClick={() => navigate('/pricing')}
                                    className="text-gray-300 hover:text-white transition-colors"
                                >
                                    Pricing
                                </button>
                                <button
                                    onClick={() => navigate('/blog')}
                                    className="text-gray-300 hover:text-white transition-colors"
                                >
                                    Blog
                                </button>
                            </div>
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
                                                onClick={handleSignOut}
                                                className="w-full text-left px-4 py-2 text-sm text-white hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-8">
                                <button
                                    onClick={() => navigate('/auth')}
                                    className="bg-teal-primary hover:bg-teal-primary/90 text-white px-6 py-2 rounded-lg transition-colors"
                                >
                                    Sign In
                                </button>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Editor Image Section */}


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


                {/* Contact Screen Section */}
                <div className="relative w-full max-w-6xl mx-auto px-6 mt-8 mb-12">
                    <motion.div
                        ref={firstImageRef}
                        className="relative"
                        style={{
                            y: firstImageY,
                            scale: firstImageScale,
                            opacity: firstImageOpacity
                        }}
                    >
                        <div className="relative">
                            <img
                                src={ContactScreen}
                                alt="SalesIQ Dashboard rounded-lg"
                                className="w-full h-auto shadow-2x border-2 border-[#67BAAA] rounded-lg"
                                width={1000}
                                height={500}
                            />
                            {/* Gradient Mask */}
                            <div
                                className="absolute bottom-0 left-0 right-0 h-[650px]"
                                style={{
                                    background: 'linear-gradient(to top, #184A5D 5%, #184A5D 2%, #184A5D 1%, rgba(13, 52, 65, 0.4) 60%, rgba(13, 52, 65, 0) 100%)'
                                }}
                            ></div>
                        </div>
                    </motion.div>
                </div>

                {/* Features Section */}
                <div className="container mx-auto px-6 py-24 relative z-10">
                    <div className="grid md:grid-cols-3 gap-12">
                        <motion.div
                            className="text-center backdrop-blur-sm bg-white/5 rounded-2xl p-8 border border-white/10 hover:border-teal-primary/30 transition-colors"
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5 }}
                            whileHover={{
                                scale: 1.02,
                                transition: { duration: 0.2 }
                            }}
                        >
                            <motion.div
                                className="bg-teal-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                                initial={{ scale: 0 }}
                                whileInView={{ scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            >
                                <svg className="w-8 h-8 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                </svg>
                            </motion.div>
                            <motion.h3
                                className="text-xl font-semibold mb-4"
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                Smart Lead Management
                            </motion.h3>
                            <motion.p
                                className="text-gray-300"
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                Intelligently organize and track your leads through every stage of the sales process.
                            </motion.p>
                        </motion.div>

                        <motion.div
                            className="text-center backdrop-blur-sm bg-white/5 rounded-2xl p-8 border border-white/10 hover:border-teal-primary/30 transition-colors"
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            whileHover={{
                                scale: 1.02,
                                transition: { duration: 0.2 }
                            }}
                        >
                            <motion.div
                                className="bg-teal-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                                initial={{ scale: 0 }}
                                whileInView={{ scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                            >
                                <svg className="w-8 h-8 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </motion.div>
                            <motion.h3
                                className="text-xl font-semibold mb-4"
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                Advanced Analytics
                            </motion.h3>
                            <motion.p
                                className="text-gray-300"
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                Get deep insights into your sales performance with powerful analytics tools.
                            </motion.p>
                        </motion.div>

                        <motion.div
                            className="text-center backdrop-blur-sm bg-white/5 rounded-2xl p-8 border border-white/10 hover:border-teal-primary/30 transition-colors"
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            whileHover={{
                                scale: 1.02,
                                transition: { duration: 0.2 }
                            }}
                        >
                            <motion.div
                                className="bg-teal-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                                initial={{ scale: 0 }}
                                whileInView={{ scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                            >
                                <svg className="w-8 h-8 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </motion.div>
                            <motion.h3
                                className="text-xl font-semibold mb-4"
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                            >
                                Task Automation
                            </motion.h3>
                            <motion.p
                                className="text-gray-300"
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                            >
                                Automate repetitive tasks and focus on what matters most - closing deals.
                            </motion.p>
                        </motion.div>
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

                {/* Analytics and Reporting Section */}
                <div className="container mx-auto px-6 py-24 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Content */}
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                                AI-Powered Sales Analytics
                            </h2>
                            <div className="space-y-4">
                                <p className="text-xl text-gray-300">
                                    Generate intelligent reports and insights that help you maintain{' '}
                                    <span className="text-teal-primary">complete control of your sales growth</span>{' '}
                                    with real-time data visualization.
                                </p>
                                <p className="text-gray-300">
                                    Start with our AI-enhanced pre-built dashboards or create your own custom views. Our intelligent system will automatically highlight key trends and opportunities.
                                </p>
                            </div>
                            <div className="space-y-4 pt-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-teal-primary/20 flex items-center justify-center mt-1">
                                        <svg className="w-4 h-4 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Real-time Analytics</h3>
                                        <p className="text-gray-300">Monitor your sales performance with live updates and AI-driven insights</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-teal-primary/20 flex items-center justify-center mt-1">
                                        <svg className="w-4 h-4 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Predictive Insights</h3>
                                        <p className="text-gray-300">AI-powered forecasting to help you make data-driven decisions</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-teal-primary/20 flex items-center justify-center mt-1">
                                        <svg className="w-4 h-4 text-teal-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Custom Reports</h3>
                                        <p className="text-gray-300">Create tailored reports with drag-and-drop simplicity</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Image */}
                        <motion.div
                            className="relative"
                            initial={{ opacity: 0, x: 100 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="relative rounded-lg overflow-hidden border-2 border-teal-primary/30 shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-tr from-navy-deep/80 via-transparent to-transparent z-10"></div>
                                <img
                                    src={Screenshot4}
                                    alt="SalesIQ Analytics Dashboard"
                                    className="w-full h-auto rounded-lg"
                                />
                            </div>
                            {/* Decorative Elements */}
                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-teal-primary/20 rounded-full blur-2xl"></div>
                            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-teal-primary/10 rounded-full blur-2xl"></div>
                        </motion.div>
                    </div>
                </div>

                {/* Data Analysis Section */}
                <div className="container mx-auto px-6 py-24 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left Content */}
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                                Analyze Your Data
                            </h2>
                            <div className="space-y-4">
                                <p className="text-xl text-gray-300">
                                    Dive deep into your data and make better decisions. Our AI-powered platform helps you explore your information dynamically to identify trends and understand your results better.
                                </p>
                                <p className="text-gray-300">
                                    Explore all your data using different{' '}
                                    <span className="text-teal-primary">types of visualizations</span>{' '}
                                    and filters by time periods. Our AI assistant will automatically highlight key insights and opportunities.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-6 pt-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-teal-primary/20 flex items-center justify-center">
                                            <svg className="w-3 h-3 text-teal-primary" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                            </svg>
                                        </div>
                                        <span className="text-white">Smart Insights</span>
                                    </div>
                                    <p className="text-sm text-gray-300">AI-powered analysis highlighting key patterns</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-teal-primary/20 flex items-center justify-center">
                                            <svg className="w-3 h-3 text-teal-primary" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <span className="text-white">Multiple Charts</span>
                                    </div>
                                    <p className="text-sm text-gray-300">Visualize data in various formats</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-teal-primary/20 flex items-center justify-center">
                                            <svg className="w-3 h-3 text-teal-primary" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-white">Time Analysis</span>
                                    </div>
                                    <p className="text-sm text-gray-300">Track trends over custom periods</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-teal-primary/20 flex items-center justify-center">
                                            <svg className="w-3 h-3 text-teal-primary" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                            </svg>
                                        </div>
                                        <span className="text-white">Custom Filters</span>
                                    </div>
                                    <p className="text-sm text-gray-300">Flexible data filtering options</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Graph Display */}
                        <motion.div
                            className="relative"
                            ref={secondSectionRef}
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <motion.div
                                    className="col-span-2"
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                                        <div className="text-sm text-white mb-2">Sales Performance Timeline</div>
                                        <img
                                            src={Screenshot1}
                                            alt="Sales Timeline"
                                            className="w-full h-auto"
                                        />
                                    </div>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: 0.2 }}
                                >
                                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                                        <div className="text-sm text-white mb-2">Revenue Distribution</div>
                                        <img
                                            src={Screenshot2}
                                            alt="Revenue Distribution"
                                            className="w-full h-auto"
                                        />
                                    </div>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: 0.4 }}
                                >
                                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                                        <div className="text-sm text-white mb-2">Growth Prediction</div>
                                        <img
                                            src={Screenshot3}
                                            alt="Growth Prediction"
                                            className="w-full h-auto"
                                        />
                                    </div>
                                </motion.div>
                            </div>
                            {/* Decorative Elements */}
                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-teal-primary/20 rounded-full blur-2xl"></div>
                            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-teal-primary/10 rounded-full blur-2xl"></div>
                        </motion.div>
                    </div>
                </div>

                {/* Call to Action Section - if it exists */}

                {/* Footer */}
                <footer className="border-t border-white/10 bg-navy-deep/50 backdrop-blur-sm">
                    <div className="container mx-auto px-6 py-12">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                            {/* Logo and Description */}
                            <div className="col-span-2">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full border-2 border-teal-primary flex items-center justify-center text-teal-primary text-lg font-bold">
                                        S
                                    </div>
                                    <span className="ml-2 font-semibold text-lg">SalesIQ</span>
                                </div>
                                <p className="mt-4 text-sm text-gray-400">
                                    Transform your sales process with AI-powered insights and automation. Make data-driven decisions and close more deals.
                                </p>
                                <div className="flex space-x-4 mt-6">
                                    <a href="#" className="text-gray-400 hover:text-teal-primary transition-colors">
                                        <span className="sr-only">Twitter</span>
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                        </svg>
                                    </a>
                                    <a href="#" className="text-gray-400 hover:text-teal-primary transition-colors">
                                        <span className="sr-only">LinkedIn</span>
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                        </svg>
                                    </a>
                                    <a href="#" className="text-gray-400 hover:text-teal-primary transition-colors">
                                        <span className="sr-only">GitHub</span>
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                        </svg>
                                    </a>
                                </div>
                            </div>

                            {/* Product Links */}
                            <div className="col-span-1">
                                <h3 className="font-semibold text-white">Product</h3>
                                <ul className="mt-4 space-y-2">
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Features</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Pricing</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Security</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Roadmap</a>
                                    </li>
                                </ul>
                            </div>

                            {/* Resources Links */}
                            <div className="col-span-1">
                                <h3 className="font-semibold text-white">Resources</h3>
                                <ul className="mt-4 space-y-2">
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Blog</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Documentation</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Help Center</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">API</a>
                                    </li>
                                </ul>
                            </div>

                            {/* Company Links */}
                            <div className="col-span-1">
                                <h3 className="font-semibold text-white">Company</h3>
                                <ul className="mt-4 space-y-2">
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">About</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Careers</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Contact</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Partners</a>
                                    </li>
                                </ul>
                            </div>

                            {/* Legal Links */}
                            <div className="col-span-1">
                                <h3 className="font-semibold text-white">Legal</h3>
                                <ul className="mt-4 space-y-2">
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Privacy</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Terms</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Cookie Policy</a>
                                    </li>
                                    <li>
                                        <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">Licenses</a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className="mt-12 pt-8 border-t border-white/10">
                            <div className="flex flex-col md:flex-row justify-between items-center">
                                <p className="text-sm text-gray-400">
                                    © {new Date().getFullYear()} SalesIQ. All rights reserved.
                                </p>
                                <div className="mt-4 md:mt-0 flex space-x-6">
                                    <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">
                                        Privacy Policy
                                    </a>
                                    <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">
                                        Terms of Service
                                    </a>
                                    <a href="#" className="text-sm text-gray-400 hover:text-teal-primary transition-colors">
                                        Cookie Settings
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
} 