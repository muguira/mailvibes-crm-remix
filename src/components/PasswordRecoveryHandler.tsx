import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const PasswordRecoveryHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for password recovery parameters in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    // Check if this is a password recovery redirect from Supabase
    if (urlParams.get('type') === 'recovery' || hash.includes('type=recovery')) {
      console.log('🔄 Password recovery detected at app level, redirecting to reset page...');
      console.log('Current path:', location.pathname);
      console.log('URL params:', window.location.search);
      console.log('Hash:', hash);
      
      // Only redirect if we're not already on the reset password page
      if (location.pathname !== '/auth/reset-password') {
        // Redirect to reset page with all URL parameters
        navigate('/auth/reset-password' + window.location.search + window.location.hash);
      }
    }
  }, [location, navigate]);

  // This component doesn't render anything
  return null;
};
