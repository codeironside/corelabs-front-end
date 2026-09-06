import { initializeApp, type FirebaseApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup, type Auth } from 'firebase/auth';
import { config } from '@/config';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    config.firebase.apiKey &&
      config.firebase.authDomain &&
      config.firebase.projectId &&
      config.firebase.appId,
  );
}

export function getFirebaseAuth(): Auth {
  if (auth) {
    return auth;
  }

  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured for CoreLabsStudio.');
  }

  app = initializeApp({
    apiKey: config.firebase.apiKey,
    authDomain: config.firebase.authDomain,
    projectId: config.firebase.projectId,
    appId: config.firebase.appId,
    storageBucket: config.firebase.storageBucket || undefined,
    messagingSenderId: config.firebase.messagingSenderId || undefined,
  });
  // Google popup must open this project's handler, not ajeoba-web-storage.
  if (app.options.authDomain !== 'ajeoba-54fca.firebaseapp.com') {
    throw new Error('Firebase Auth is not using the ajeoba-54fca auth domain.');
  }
  auth = getAuth(app);
  return auth;
}

/** Google sign-in popup owned by the Studio frontend (never redirects to identity). */
export async function signInWithGoogleIdToken(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(getFirebaseAuth(), provider);
  return result.user.getIdToken();
}

export function isGooglePopupCancelled(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}
