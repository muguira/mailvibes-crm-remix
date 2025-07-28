
import React, { useEffect, useCallback, useState } from 'react';
import { TopNavbar } from "@/components/layout/top-navbar";
import { TasksPanel } from "@/components/home/tasks-panel";
import { FeedPanel } from "@/components/home/feed-panel";
import { WelcomeHeader } from "@/components/home/welcome-header";
import { AddTeammatesCard } from "@/components/home/add-teammates-card";
import { CreateOrganizationModal } from "@/components/organization/CreateOrganizationModal";
import { useAuth } from "@/components/auth";
import { useOrganizationActions, useOrganizationData, useOrganizationLoadingStates } from '@/stores/organizationStore';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

const Index = () => {
  const { user, loading } = useAuth();
  const { needsOrganization, error } = useOrganizationData();
  const { checkingOrganization, creatingOrganization } = useOrganizationLoadingStates();
  const { checkUserOrganization, createPersonalWorkspace, clearError } = useOrganizationActions();

  // Check for password recovery redirect from Supabase
  useEffect(() => {
    const handlePasswordRecovery = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      
      // Check if this is a password recovery redirect from Supabase
      if (urlParams.get('type') === 'recovery' || hash.includes('type=recovery')) {
        console.log('🔄 Password recovery detected, redirecting to reset page...');
        // Redirect to reset page with all URL parameters
        window.location.href = '/auth/reset-password' + window.location.search + window.location.hash;
      }
    };

    handlePasswordRecovery();
  }, []);

  // Initialize organization data when user is authenticated - only run once per user
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 User authenticated, checking organization status');
      checkUserOrganization();
    }
  }, [user?.id]); // Only depend on user ID, not the function

  // Clear any errors when component mounts
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, []); // Only run once on mount

  // Handle modal close/skip with simplified workflow
  const handleModalClose = useCallback(async () => {
    if (user?.id && !creatingOrganization) {
      try {
        console.log('🏢 User skipped organization creation, creating personal workspace...');
        
        await createPersonalWorkspace();
        
        console.log('✅ Personal workspace created successfully');
        
      } catch (error) {
        console.error('❌ Error creating personal workspace:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to create workspace';
        
        // Provide user-friendly error messages
        if (errorMessage.includes('Database permission error')) {
          toast.error('Database Permission Issue', {
            description: 'Please refresh the page and try again. If this persists, contact support.',
            duration: 8000,
          });
        } else if (errorMessage.includes('already exists') || errorMessage.includes('already taken')) {
          toast.error('Domain Conflict', {
            description: 'A workspace with this domain already exists. Please try again.',
            duration: 5000,
          });
        } else {
          toast.error('Failed to create workspace', {
            description: errorMessage,
            duration: 5000,
          });
        }
      }
    }
  }, [user?.id, createPersonalWorkspace, creatingOrganization]);

  // Show loading indicator while checking authentication or organization
  if (loading || checkingOrganization) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth page if not logged in
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-light/20">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar />
        
        {/* Welcome Header Section - Not sticky */}
        <div className="overflow-auto flex-1">
          <WelcomeHeader />
          
          {/* Content Section - Positioned very close to My Week bar */}
          <div className="md:px-6 px-2 -mt-14">
            <div className="flex justify-between">
              {/* Left Column - Tasks - Fixed width */}
              <div className="w-full md:w-[570px] flex-shrink-0">
                <TasksPanel />
              </div>

              {/* Right Column - Teammates Card + Feed - Fixed 400px width */}
              <div className="hidden md:block w-[400px] space-y-4">
                {/* Add Teammates Card */}
                <AddTeammatesCard />
                
                {/* Activity Feed Panel */}
                <FeedPanel />
              </div>
            </div>
            
            {/* Mobile view - Show teammates card and feed below tasks */}
            <div className="md:hidden mt-6 space-y-4">
              <AddTeammatesCard />
              <FeedPanel />
            </div>
          </div>
        </div>
      </div>

      {/* Organization Creation Modal - Clean and Simple */}
      <CreateOrganizationModal 
        isOpen={needsOrganization && !creatingOrganization}
        onClose={handleModalClose}
      />

      {/* Loading state while creating personal workspace */}
      {creatingOrganization && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#32BAB0]"></div>
              <div>
                <h3 className="font-medium">Creating your workspace...</h3>
                <p className="text-sm text-gray-500">This will only take a moment</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
