// src/pages/AuthRedirect.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      // Extract the hash parameters from the URL
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresIn = params.get('expires_in');
      const tokenType = params.get('token_type');

      if (accessToken && refreshToken) {
        // Set the session in Supabase
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Error setting session:', error.message);
          navigate('/login');
          return;
        }

        // Redirect to the dashboard after successful authentication
        navigate('/dashboard');
      } else {
        // Fallback if no tokens are found
        navigate('/login');
      }
    };

    handleAuth();
  }, [navigate]);

  return <p>Verifying your email, please wait...</p>;
};

export default AuthRedirect;