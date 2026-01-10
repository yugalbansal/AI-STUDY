import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Helmet } from 'react-helmet-async';

/**
 * SSO Callback Handler - Clerk processes OAuth at clerk.vectormind.site/v1/oauth_callback
 * This page just checks if user is authenticated and redirects accordingly
 */
export default function SSOCallback() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
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
