import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      checkUserRole(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkUserRole(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUserRole(userId: string | undefined) {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    try {
      // Special case for the admin email - check auth user first
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user?.email === 'studyai.platform@gmail.com') {
        setIsAdmin(true);
        
        // Ensure user record exists in users table
        await ensureUserExists(userId, authUser.user.email, true);
        return;
      }

      // Check if user exists in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user role:', userError);
        
        // If user doesn't exist in the users table, create them
        if (userError.code === 'PGRST116') {
          await ensureUserExists(userId, authUser?.user?.email || '', false);
          setIsAdmin(false);
        } else {
          setIsAdmin(false);
        }
        return;
      }

      setIsAdmin(userData?.role === 'admin');
    } catch (error) {
      console.error('Error in checkUserRole:', error);
      setIsAdmin(false);
    }
  }

  async function ensureUserExists(userId: string, email: string, isAdmin: boolean) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email,
          role: isAdmin ? 'admin' : 'user',
          last_seen: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error ensuring user exists:', error);
      }
    } catch (error) {
      console.error('Error in ensureUserExists:', error);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  const value = {
    user,
    signIn,
    signOut,
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