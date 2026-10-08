import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const PROFILE_CACHE_KEY = "traceability.profile";

function readCachedProfile(userId) {
  try {
    const cached = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY));
    return cached && cached.id === userId ? cached : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile) {
  try {
    if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

// Loads the signed-in user's profile (role, company). Falls back to the
// cached copy when offline so field workers aren't locked out.
async function loadProfile(user) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, company_id, full_name, role")
    .eq("id", user.id)
    .single();
  if (error || !data) return readCachedProfile(user.id);
  writeCachedProfile(data);
  return data;
}

export function useSession() {
  const [state, setState] = useState({ loading: true, session: null, profile: null });

  useEffect(() => {
    if (!supabase) {
      setState({ loading: false, session: null, profile: null });
      return;
    }
    let active = true;

    async function apply(session) {
      const profile = session ? await loadProfile(session.user) : null;
      if (active) setState({ loading: false, session, profile });
    }

    // Fires INITIAL_SESSION right away, then on every login/logout/refresh.
    // Supabase calls must not run inside this callback (it can deadlock), so defer.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") writeCachedProfile(null);
      setTimeout(() => apply(session), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function homePathFor(profile) {
  return profile?.role === "admin" ? "/admin" : "/form-demo";
}

export async function signOut() {
  writeCachedProfile(null);
  await supabase.auth.signOut();
}
