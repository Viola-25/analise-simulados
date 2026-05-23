import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function parseCookieHeader(cookieHeader: string | undefined) {
  const cookieEntries: Array<{ name: string; value: string }> = [];

  if (!cookieHeader) {
    return cookieEntries;
  }

  cookieHeader.split(';').forEach((pair) => {
    const [rawName, ...rawValueParts] = pair.trim().split('=');
    if (!rawName) {
      return;
    }

    cookieEntries.push({
      name: rawName,
      value: decodeURIComponent(rawValueParts.join('=')),
    });
  });

  return cookieEntries;
}

export type SupabaseRequest = Request & {
  supabase?: ReturnType<typeof createServerClient>;
};

export function supabaseSessionMiddleware(): RequestHandler {
  return (req: SupabaseRequest, res: Response, next: NextFunction) => {
    if (!supabaseUrl || !supabaseKey) {
      next(new Error('Defina as variáveis de ambiente Supabase no servidor.'));
      return;
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return parseCookieHeader(req.headers.cookie);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookie(name, value, options);
          });
        },
      },
    });

    req.supabase = supabase;
    next();
  };
}