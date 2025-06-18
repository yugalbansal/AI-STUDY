// src/pages/AuthRedirect.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error.message);
        navigate('/login'); // fallback if session is not valid
      }

      if (data?.session) {
        navigate('/dashboard'); // redirect to a protected route
      } else {
        navigate('/login'); // fallback if not authenticated
      }
    };

    handleAuth();
  }, [navigate]);

  return <p>Verifying your email, please wait...</p>;
};

export default AuthRedirect;
