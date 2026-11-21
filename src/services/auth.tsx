import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import type { LocalUser } from "@/data/types";
import { auth, useStore } from "@/services/localStore";
import { allowLocalAuth, isSupabaseConfigured, supabase } from "@/lib/supabase";

interface AuthContextValue {
  user: LocalUser | null;
  mode: "local" | "supabase";
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const profile = useQuery({
    queryKey: ["profile", sessionUser?.id],
    enabled: Boolean(sessionUser),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase!
        .from("profiles")
        .select("display_name,role")
        .eq("id", sessionUser!.id)
        .abortSignal(signal)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    gcTime: 0,
  });

  const remoteUser: LocalUser | null = useMemo(
    () =>
      sessionUser
        ? {
            id: sessionUser.id,
            email: sessionUser.email ?? "",
            name: profile.data?.display_name || sessionUser.email?.split("@")[0] || "Member",
            role: profile.data?.role === "admin" || profile.data?.role === "editor" ? profile.data.role : "member",
            mode: "supabase",
          }
        : null,
    [sessionUser, profile.data],
  );

  const signInWithEmail = useCallback(async (email: string) => {
    if (!supabase) return { error: "ยังไม่ได้ตั้งค่า Supabase — ใช้โหมดเครื่องนี้แทน" };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: supabase ? remoteUser : allowLocalAuth ? store.user : null,
      mode: supabase ? "supabase" : "local",
      loading: loading || (Boolean(sessionUser) && profile.isPending),
      signInWithEmail,
      signOut,
    }),
    [remoteUser, store.user, loading, sessionUser, profile.isPending, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
