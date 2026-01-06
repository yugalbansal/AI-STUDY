import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any;
  loading: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      checkUserRole(session?.user?.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkUserRole(session?.user?.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUserRole(userId: string | undefined) {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    try {
      // Query users table for role - trigger already created the user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

      if (userError) {
        console.error('Error fetching user role:', userError);
        setIsAdmin(false);
        return;
      }

      // If user doesn't exist yet (race condition with trigger), wait and retry once
      if (!userData) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: retryData } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        
        setIsAdmin(retryData?.role === 'admin');
        return;
      }

      setIsAdmin(userData.role === 'admin');
    } catch (error) {
      console.error('Error in checkUserRole:', error);
      setIsAdmin(false);
    }
  }

  async function signIn(email: string, password: string, captchaToken?: string) {
    const authOptions: any = {
      email,
      password,
    };

    // Add captcha token if provided
    if (captchaToken) {
      authOptions.options = {
        captchaToken
      };
    }

    const { error } = await supabase.auth.signInWithPassword(authOptions);
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function signUp(email: string, password: string, captchaToken?: string) {
    const authOptions: any = {
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/Login',
      },
    };

    // Add captcha token if provided
    if (captchaToken) {
      authOptions.options.captchaToken = captchaToken;
    }

    const { error } = await supabase.auth.signUp(authOptions);
    if (error) throw error;
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (error) throw error;
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
    signUp,
    signInWithGoogle,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
