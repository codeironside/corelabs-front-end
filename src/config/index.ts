import { z } from 'zod';

const FIREBASE_PROJECT_ID = 'ajeoba-54fca';
const FIREBASE_AUTH_DOMAIN = 'ajeoba-54fca.firebaseapp.com';
const FIREBASE_STORAGE_BUCKET = 'ajeoba-54fca.firebasestorage.app';
const PRODUCTION_STUDIO_API_URL = 'https://api.studios.corelabs.it.com/api/v1';

function resolveStudioApiUrl(): string {
  if (import.meta.env.PROD) {
    return PRODUCTION_STUDIO_API_URL;
  }
  const fromEnv = import.meta.env.VITE_STUDIO_API_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, '');
  }
  return 'http://localhost:4005/api/v1';
}

const envSchema = z.object({
  VITE_APP_NAME: z.string().default('CoreLabsStudio'),
  VITE_STUDIO_API_URL: z.string().url(),
  VITE_FIREBASE_API_KEY: z.string().default(''),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().default(''),
  VITE_FIREBASE_APP_ID: z.string().default(''),
});

const parsed = envSchema.parse({
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  VITE_STUDIO_API_URL: resolveStudioApiUrl(),
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const config = {
  appName: parsed.VITE_APP_NAME,
  studioApiUrl: parsed.VITE_STUDIO_API_URL,
  firebase: {
    apiKey: parsed.VITE_FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: parsed.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: parsed.VITE_FIREBASE_APP_ID,
  },
} as const;
