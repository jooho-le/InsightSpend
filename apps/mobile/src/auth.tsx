import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type User,
} from "firebase/auth";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, googleClientIds } from "./firebase";

const redirectUri = makeRedirectUri({
  scheme: "insightspend",
  useProxy: true
});

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  promptGoogleSignIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleClientIds.web,
    iosClientId: googleClientIds.ios,
    androidClientId: googleClientIds.android,
    redirectUri,
    scopes: ["profile", "email"]
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type !== "success") return;

      const idToken = response.authentication?.idToken;
      const accessToken = response.authentication?.accessToken;

      if (!idToken) {
        return;
      }

      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      await signInWithCredential(auth, credential);
    };

    handleResponse();
  }, [response]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      promptGoogleSignIn: async () => {
        if (!request) return;
        await promptAsync({ useProxy: true });
      },
      signOutUser: async () => {
        await signOut(auth);
      },
    }),
    [user, loading, request, promptAsync]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
