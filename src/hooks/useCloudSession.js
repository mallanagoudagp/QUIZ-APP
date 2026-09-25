import { useCallback, useEffect, useState } from "react";
import { supabase, supabaseEnabled } from "../lib/supabaseClient";

export function useCloudSession(user) {
  const [cloudSession, setCloudSession] = useState(null);
  const [loading, setLoading] = useState(supabaseEnabled);
  const enabled = supabaseEnabled && !!user;

  useEffect(() => {
    let cancelled = false;
    setCloudSession(null);
    if (!enabled) { setLoading(false); return () => { cancelled = true; }; }
    setLoading(true);
    supabase.from("study_sessions").select("session").eq("user_id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to load cloud study session:", error.message);
        else setCloudSession(data?.session ?? null);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [enabled, user?.id]);

  const saveCloudSession = useCallback(async (session) => {
    if (!enabled || !session) return;
    const { error } = await supabase.from("study_sessions").upsert(
      { user_id: user.id, session, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) console.error("Failed to sync study session:", error.message);
  }, [enabled, user?.id]);

  return { cloudSession, saveCloudSession, cloudEnabled: enabled, loading };
}
