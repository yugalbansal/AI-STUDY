// src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current URL hash
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
            navigate('/login?error=auth_failed');
            return;
          }
          
          if (data?.session) {
            // Successful authentication
            navigate('/dashboard');
          } else {
            navigate('/login?error=no_session');
          }
        } else {
          // No tokens found, check if user is already authenticated
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session:', error.message);
            navigate('/login?error=session_error');
            return;
          }
          
          if (data?.session) {
            navigate('/dashboard');
          } else {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=callback_failed');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Verifying your email, please wait...</p>
      </div>
    </div>
  );
};

export default AuthCallback;