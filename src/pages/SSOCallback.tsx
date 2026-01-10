import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

/**
 * SSO Callback Handler - Wait for Clerk to complete OAuth and establish session
 * This page handles the redirect after OAuth completes at clerk.vectormind.site/v1/oauth_callback
 */
export default function SSOCallback() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const { handleRedirectCallback } = useClerk();
  const redirectHandledRef = useRef(false);

  // IMPORTANT:
  // OAuth completes at Clerk ("/v1/oauth_callback"), but the session is finalized
  // in the app by calling `handleRedirectCallback()` on the `redirectUrl` route.
  useEffect(() => {
    if (redirectHandledRef.current) return;
    redirectHandledRef.current = true;

    (async () => {
      try {
        await handleRedirectCallback({
          signInUrl: '/login',
          signUpUrl: '/login',
          afterSignInUrl: '/dashboard',
          afterSignUpUrl: '/dashboard',
        });
      } catch (error) {
        // If this fails, `isSignedIn` will remain false.
        console.error('OAuth redirect finalization failed:', error);
      }
    })();
  }, [handleRedirectCallback]);

  useEffect(() => {
    console.log('🔄 SSO Callback - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);
    
    // Wait for Clerk to finish loading auth state
    if (!isLoaded) {
      console.log('⏳ Waiting for Clerk to load...');
      return;
    }

    if (isSignedIn) {
      console.log('✅ OAuth successful! Redirecting to dashboard...');
      toast.success('Successfully signed in with Google!');
      navigate('/dashboard', { replace: true });
      return;
    }

    // Tolerate short delays where Clerk isLoaded=true but the session is still being finalized.
    const timeoutMs = 5000;
    console.log(`⏳ Not signed in yet; waiting up to ${timeoutMs}ms for finalization...`);

    const timeoutId = window.setTimeout(() => {
      console.log('❌ OAuth finalization timeout - user still not signed in');
      toast.error('Sign in did not complete. Please try again.');
      navigate('/login', { replace: true });
    }, timeoutMs);

    return () => window.clearTimeout(timeoutId);
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
