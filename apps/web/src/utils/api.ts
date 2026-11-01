import { createClient } from '@/utils/supabase/client';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // S1 FIX: Get the current session from Supabase on the client
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers = {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    ...options.headers,
  };

  return fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}