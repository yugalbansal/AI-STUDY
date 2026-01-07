// src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          console.error('Auth error:', error, errorDescription);
          toast.error(errorDescription || 'Authentication failed');
          navigate('/login');
          return;
        }

        // Get the current URL hash (for older OAuth flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Check if we have auth tokens in the hash
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          // Set the session with the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('Error setting session:', error.message);
            toast.error('Failed to authenticate. Please try again.');
            navigate('/login');
            return;
          }
          
          if (data?.session) {
            // Successful authentication
            toast.success('Successfully signed in with Google!');
            navigate('/dashboard');
          } else {
            toast.error('No session found. Please try again.');
            navigate('/login');
          }
        } else {
          // For PKCE flow (newer), check if user is already authenticated
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session:', error.message);
            toast.error('Session error. Please try signing in again.');
            navigate('/login');
            return;
          }
          
          if (data?.session) {
            toast.success('Successfully signed in with Google!');
            navigate('/dashboard');
          } else {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <>
      <Helmet>
        <title>Authenticating... - Study AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-fuchsia-500 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-lg font-medium text-gray-800">Signing you in...</p>
          <p className="mt-2 text-sm text-gray-600">Please wait while we verify your authentication</p>
        </div>
      </div>
    </>
  );
};

export default AuthCallback;