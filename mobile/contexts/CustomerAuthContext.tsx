import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";

import { customerAuth, isFirebaseConfigured } from "../services/firebase";

interface CustomerAuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isFirebaseConfigured: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined);

interface CustomerAuthProviderProps {
  children: ReactNode;
}

export function CustomerAuthProvider({ children }: CustomerAuthProviderProps) {
  const [user, setUser] = useState<User | null>(customerAuth?.currentUser ?? null);
  const [isLoading, setIsLoading] = useState(Boolean(customerAuth));

  useEffect(() => {
    if (!customerAuth) {
      setIsLoading(false);
      return undefined;
    }

    return onAuthStateChanged(customerAuth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
  }, []);

  async function login(email: string, password: string) {
    const auth = requireCustomerAuth();
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async function signup(email: string, password: string) {
    const auth = requireCustomerAuth();
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await sendEmailVerification(credential.user);
  }

  async function logout() {
    const auth = requireCustomerAuth();
    await signOut(auth);
  }

  async function getIdToken() {
    if (!customerAuth?.currentUser) {
      return null;
    }

    return customerAuth.currentUser.getIdToken();
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isFirebaseConfigured,
      isLoading,
      login,
      signup,
      logout,
      getIdToken,
    }),
    [isLoading, user],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);

  if (!context) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider.");
  }

  return context;
}

function requireCustomerAuth() {
  if (!customerAuth) {
    throw new Error("Firebase is not configured for the mobile app.");
  }

  return customerAuth;
}
