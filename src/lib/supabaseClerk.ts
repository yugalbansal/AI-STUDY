import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserResource, SessionResource } from '@clerk/types';

/**
 * Create a Supabase client that uses Clerk session token
 * This is the ONLY way to create a Supabase client after Clerk migration
 * 
 * @param session - Clerk session object from useSession()
 * @returns Supabase client with Clerk authentication
 */
export function createClerkSupabaseClient(session: SessionResource | null): SupabaseClient {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: async () => {
        // Get Clerk session token and inject it into Supabase requests
        const token = await session?.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    },
    auth: {
      // Disable Supabase auth completely (we use Clerk now)
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Sync Clerk user to Supabase database
 * Call this on first authenticated request to ensure user exists in Supabase
 * 
 * @param user - Clerk user object from useUser()
 * @param supabase - Supabase client with Clerk authentication
 * @returns Success status and optional error message
 */
export async function syncClerkUserToSupabase(
  user: UserResource,
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get primary email address
    const primaryEmail = user.emailAddresses.find(
      (email: any) => email.id === user.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail) {
      return { success: false, error: 'No primary email found' };
    }

    // Extract full name
    const fullName = user.fullName || 
                    [user.firstName, user.lastName].filter(Boolean).join(' ') || 
                    null;

    // Call the sync function (uses SECURITY DEFINER to bypass RLS)
    const { error } = await supabase.rpc('sync_clerk_user', {
      clerk_user_id: user.id,
      user_email: primaryEmail,
      user_name: fullName,
    });

    if (error) {
      console.error('Error syncing user to Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception syncing user:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if user has been synced to Supabase
 * 
 * @param userId - Clerk user ID
 * @param supabase - Supabase client with Clerk authentication
 * @returns True if user exists in Supabase
 */
export async function isUserSynced(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking user sync status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Exception checking user sync:', error);
    return false;
  }
}
