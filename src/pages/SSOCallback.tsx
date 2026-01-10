import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

/**
 * SSO Callback Handler - Wait for Clerk to complete OAuth and establish session
 * This page handles the redirect after OAuth completes at clerk.vectormind.site/v1/oauth_callback
 */
export default function SSOCallback() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    console.log('🔄 SSO Callback - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);
    
    // Wait for Clerk to finish loading auth state
    if (!isLoaded) {
      console.log('⏳ Waiting for Clerk to load...');
      return;
    }

    if (isSignedIn) {
      // Successfully authenticated
      console.log('✅ OAuth successful! Redirecting to dashboard...');
      toast.success('Successfully signed in with Google!');
      // Small delay to ensure session is fully established
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 500);
    } else {
      // OAuth failed or was cancelled
      console.log('❌ OAuth failed - user not signed in');
      toast.error('Sign in failed. Please try again.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1000);
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <>
      <Helmet>
        <title>Authenticating... - AI Study Platform</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-lg font-medium text-gray-800">Completing sign in...</p>
          <p className="mt-2 text-sm text-gray-600">Please wait a moment</p>
        </div>
      </div>
    </>
  );
}
