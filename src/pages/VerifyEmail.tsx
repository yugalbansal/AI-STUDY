import { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { toast } from 'sonner';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const { handleEmailLinkVerification } = useClerk();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    (async () => {
      try {
        await handleEmailLinkVerification({
          redirectUrl: '/login',
          redirectUrlComplete: '/dashboard',
          onVerifiedOnOtherDevice: () => {
            toast.success('Email verified. Please sign in on this device.');
          },
        });
      } catch (error) {
        console.error('Email link verification failed:', error);
        toast.error('Verification failed or link expired. Please try again.');
      }
    })();
  }, [handleEmailLinkVerification]);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Give Clerk a moment to hydrate if verification just completed.
    const timeoutId = window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <>
      <Helmet>
        <title>Verifying email... - AI Study Platform</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent mx-auto" />
          <p className="mt-6 text-lg font-medium text-gray-800">Verifying your email...</p>
          <p className="mt-2 text-sm text-gray-600">Please wait a moment</p>
        </div>
      </div>
    </>
  );
}
