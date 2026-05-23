import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente.');
}

export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseKey);