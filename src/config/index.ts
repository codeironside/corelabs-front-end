import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_NAME: z.string().default('CoreLabsStudio'),
  VITE_STUDIO_API_URL: z.string().url(),
  VITE_FIREBASE_API_KEY: z.string().default(''),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().default('ajeoba-web-storage.firebaseapp.com'),
  VITE_FIREBASE_PROJECT_ID: z.string().default('ajeoba-web-storage'),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().default('ajeoba-web-storage.firebasestorage.app'),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().default(''),
  VITE_FIREBASE_APP_ID: z.string().default(''),
});

const parsed = envSchema.parse({
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  VITE_STUDIO_API_URL: import.meta.env.VITE_STUDIO_API_URL,
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const config = {
  appName: parsed.VITE_APP_NAME,
  studioApiUrl: parsed.VITE_STUDIO_API_URL,
  firebase: {
    apiKey: parsed.VITE_FIREBASE_API_KEY,
    authDomain: parsed.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: parsed.VITE_FIREBASE_PROJECT_ID,
    storageBucket: parsed.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: parsed.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: parsed.VITE_FIREBASE_APP_ID,
  },
} as const;
