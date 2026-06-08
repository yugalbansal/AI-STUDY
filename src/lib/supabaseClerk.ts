import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserResource, SessionResource } from '@clerk/types';

/**
 * Create a Supabase client that uses Clerk session token
 * This is the ONLY way to create a Supabase client after Clerk migration
 * 
 * @param session - Clerk session object from useSession()
 * @returns Supabase client with Clerk authentication
 */
export async function createClerkSupabaseClient(session: SessionResource | null): Promise<SupabaseClient> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const jwtTemplate = import.meta.env.VITE_CLERK_SUPABASE_JWT_TEMPLATE || 'supabase';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Define custom fetch implementation to dynamically retrieve fresh token from Clerk session
  const customFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    const requestOptions = options || {};
    requestOptions.headers = requestOptions.headers || {};

    if (session) {
      try {
        // Retrieve fresh token (Clerk automatically handles refreshing if expired/nearing expiration)
        const freshToken = await session.getToken({ template: jwtTemplate });
        if (freshToken) {
          // Set or overwrite the Authorization header
          if (requestOptions.headers instanceof Headers) {
            requestOptions.headers.set('Authorization', `Bearer ${freshToken}`);
          } else if (Array.isArray(requestOptions.headers)) {
            const authIndex = requestOptions.headers.findIndex(([key]) => key.toLowerCase() === 'authorization');
            if (authIndex !== -1) {
              requestOptions.headers[authIndex] = ['Authorization', `Bearer ${freshToken}`];
            } else {
              requestOptions.headers.push(['Authorization', `Bearer ${freshToken}`]);
            }
          } else {
            requestOptions.headers = {
              ...requestOptions.headers,
              'Authorization': `Bearer ${freshToken}`,
            };
          }
        }
      } catch (err) {
        console.warn('Supabase customFetch: Failed to get Clerk session token:', err);
      }
    }

    return fetch(url, requestOptions);
  };

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: customFetch,
    },
    auth: {
      // Disable Supabase auth completely (we use Clerk now)
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storageKey: 'studyai-supabase-clerk',
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
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
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
      return false;
    }

    return !!data;
  } catch (error) {
    return false;
  }
}
