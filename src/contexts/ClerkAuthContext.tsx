import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useSession, useClerk } from '@clerk/clerk-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClerkSupabaseClient, syncClerkUserToSupabase } from '../lib/supabaseClerk';
import { vectorSearchService } from '../lib/vectorSearch';

interface ClerkAuthContextType {
  user: any; // Clerk User object
  userId: string | null; // Clerk user ID
  loading: boolean;
  isAdmin: boolean;
  supabase: SupabaseClient | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>; // Force re-sync user
}

const ClerkAuthContext = createContext<ClerkAuthContextType | undefined>(undefined);

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: userLoaded } = useUser();
  const { session, isLoaded: sessionLoaded } = useSession();
  const { signOut: clerkSignOut } = useClerk();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [syncAttempted, setSyncAttempted] = useState(false);

  const loading = !userLoaded || !sessionLoaded;

  // Initialize Supabase client with Clerk session (only once per session change)
  useEffect(() => {
    async function initSupabase() {
      if (sessionLoaded && session) {
        const client = await createClerkSupabaseClient(session);
        setSupabase(client);
        vectorSearchService.setSupabaseClient(client);
      } else if (sessionLoaded && !session) {
        setSupabase(null);
        vectorSearchService.setSupabaseClient(null);
      }
    }
    
    initSupabase();
  }, [session?.id, sessionLoaded]); // Only recreate when session ID changes

  // Sync user to Supabase on first load
  useEffect(() => {
    async function syncUser() {
      if (!user || !supabase || syncAttempted) return;
      
      setSyncAttempted(true);
      const result = await syncClerkUserToSupabase(user, supabase);
      
      if (result.success) {
        console.log('✅ User synced to Supabase');
        // Check admin status after successful sync
        await checkUserRole();
      } else {
        console.error('❌ Failed to sync user:', result.error);
        // Retry after a delay
        setTimeout(() => {
          setSyncAttempted(false);
        }, 2000);
      }
    }

    syncUser();
  }, [user, supabase, syncAttempted]);

  // Always (re)check role once auth + supabase are ready
  useEffect(() => {
    if (!user || !supabase) {
      setIsAdmin(false);
      return;
    }

    void checkUserRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, supabase]);

  // Check if user has admin role
  async function checkUserRole() {
    if (!user || !supabase) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error in checkUserRole:', error);
      setIsAdmin(false);
    }
  }

  // Force refresh auth state (re-sync user)
  async function refreshAuth() {
    setSyncAttempted(false);
    if (user && supabase) {
      const result = await syncClerkUserToSupabase(user, supabase);
      if (result.success) {
        await checkUserRole();
      }
    }
  }

  // Sign out handler
  async function signOut() {
    try {
      await clerkSignOut();
      // Clear local state
      setIsAdmin(false);
      setSyncAttempted(false);
      // Redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  const value = {
    user,
    userId: user?.id || null,
    loading,
    isAdmin,
    supabase,
    signOut,
    refreshAuth,
  };

  return <ClerkAuthContext.Provider value={value}>{children}</ClerkAuthContext.Provider>;
}

export function useClerkAuth() {
  const context = useContext(ClerkAuthContext);
  if (context === undefined) {
    throw new Error('useClerkAuth must be used within a ClerkAuthProvider');
  }
  return context;
}
