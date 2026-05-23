import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export type CookieValue = {
  name: string;
  value: string;
  options?: unknown;
};

export type CookieStoreLike = {
  getAll: () => Array<{ name: string; value: string }>;
  setAll: (cookiesToSet: CookieValue[]) => void;
};

export const createClient = (cookieStore: CookieStoreLike) => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Defina as variáveis de ambiente Supabase no servidor.');
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookieStore.setAll(cookiesToSet);
          } catch {
            // Em handlers que não permitem escrita de cookie, a sessão ainda pode ser mantida no cliente.
          }
        },
      },
    },
  );
};