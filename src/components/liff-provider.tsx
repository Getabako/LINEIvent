"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiff } from "@/hooks/use-liff";
import type { Profile } from "@/types/database";

interface LiffContextType {
  isReady: boolean;
  isLoggedIn: boolean;
  isAuthenticating: boolean;
  profile: Profile | null;
  login: () => void;
  logout: () => void;
  error: string | null;
}

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  isLoggedIn: false,
  isAuthenticating: false,
  profile: null,
  login: () => {},
  logout: () => {},
  error: null,
});

export function useLiffContext() {
  return useContext(LiffContext);
}

export function LiffProvider({ children }: { children: ReactNode }) {
  const { liff, isLoggedIn, isReady, error: liffError, login, logout } = useLiff();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function authenticateWithSupabase() {
      if (!liff || !isLoggedIn || !isReady) return;

      setIsAuthenticating(true);
      try {
        // Check if already have a Supabase session
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Load profile
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          if (profileData) {
            setProfile(profileData);
          }
          setIsAuthenticating(false);
          return;
        }

        // No Supabase session — bridge LINE auth
        const idToken = liff.getIDToken();
        const liffProfile = await liff.getProfile();

        const res = await fetch("/api/auth/line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            displayName: liffProfile.displayName,
            pictureUrl: liffProfile.pictureUrl,
            email: liff.getDecodedIDToken()?.email,
          }),
        });

        if (!res.ok) {
          throw new Error("LINE認証に失敗しました");
        }

        const { tokenHash, type } = await res.json();

        // Verify OTP to create session
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type || "magiclink",
        });

        if (verifyError) {
          throw new Error("セッションの作成に失敗しました");
        }

        // Load profile after session creation
        const {
          data: { user: newUser },
        } = await supabase.auth.getUser();
        if (newUser) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newUser.id)
            .single();
          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch (err) {
        console.error("Auth error:", err);
        setError(err instanceof Error ? err.message : "認証に失敗しました");
      } finally {
        setIsAuthenticating(false);
      }
    }

    authenticateWithSupabase();
  }, [liff, isLoggedIn, isReady, supabase]);

  return (
    <LiffContext.Provider
      value={{
        isReady,
        isLoggedIn,
        isAuthenticating,
        profile,
        login,
        logout,
        error: error || liffError,
      }}
    >
      {children}
    </LiffContext.Provider>
  );
}
