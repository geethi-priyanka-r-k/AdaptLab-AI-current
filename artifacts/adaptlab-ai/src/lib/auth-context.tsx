import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authClient, type AuthSession } from "./supabase-auth";

type AuthContextValue = {
  session: AuthSession | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  signUp: (email: string, password: string, name: string) => ReturnType<typeof authClient.signUp>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void authClient.getSession().then(setSession).finally(() => setIsLoading(false));
    return authClient.subscribe(() => void authClient.getSession().then(setSession));
  }, []);

  const value: AuthContextValue = {
    session,
    isLoading,
    isConfigured: authClient.isConfigured(),
    signIn: authClient.signIn,
    signUp: authClient.signUp,
    signOut: authClient.signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}