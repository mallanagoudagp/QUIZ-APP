import { useCallback, useEffect, useState } from "react";
import { supabase, supabaseEnabled } from "../lib/supabaseClient";

/**
 * Thin wrapper around Supabase auth. When Supabase isn't configured
 * (`supabaseEnabled === false`), `user` stays null and the caller should
 * treat the app as guest-only — nothing here throws or blocks in that case.
 */
export function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(supabaseEnabled);

  useEffect(() => {
    if (!supabaseEnabled) return;

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { enabled: supabaseEnabled, user, loading, signInWithEmail, signOut };
}
