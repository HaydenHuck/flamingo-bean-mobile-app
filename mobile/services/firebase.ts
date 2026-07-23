import { getApp, getApps, initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";

declare const process: { env: Record<string, string | undefined> } | undefined;

const env = typeof process === "undefined" ? {} : process.env;

const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  measurementId: env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.appId &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId,
);

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const customerAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
