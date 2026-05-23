import type { Session, SupabaseClient } from '@supabase/supabase-js';

export function syncSupabaseSession(
  supabase: SupabaseClient,
  onSessionChange: (session: Session | null) => void,
) {
  let isActive = true;

  supabase.auth.getSession().then(({ data }) => {
    if (isActive) {
      onSessionChange(data.session);
    }
  });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onSessionChange(session);
  });

  return () => {
    isActive = false;
    data.subscription.unsubscribe();
  };
}