import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import defaultFirebaseConfig from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// For admin (requires extra scopes)
const adminProvider = new GoogleAuthProvider();
adminProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
adminProvider.addScope('https://www.googleapis.com/auth/gmail.send');

// For regular customers
const customerProvider = new GoogleAuthProvider();

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory.
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  // Try to get redirect result first
  getRedirectResult(auth).then((result) => {
    if (result) {
      if (result.providerId === adminProvider.providerId) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
        }
      }
    }
  }).catch(error => {
    console.error("Redirect result error:", error);
  });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (isAdmin: boolean = false): Promise<void> => {
  try {
    isSigningIn = true;
    const provider = isAdmin ? adminProvider : customerProvider;
    
    // Always use popup, redirect often fails in embedded browsers (like Facebook)
    const result = await signInWithPopup(auth, provider);
    
    if (isAdmin && result && result.providerId === adminProvider.providerId) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
    }
    isSigningIn = false;
  } catch (error: any) {
    console.error('Sign in error:', error);
    if (error.code === 'auth/unauthorized-domain' || error.code?.includes('api-key-not-valid')) {
      alert(`Sign in failed: ${error.code}\n\nFIX FOR NETLIFY:\nYou need to add your Firebase config to Netlify Environment Variables.\n\nTo fix:\n1. Go to Netlify -> Site Settings -> Environment variables.\n2. Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, etc., from your Firebase project.\n3. IMPORTANT: Go to Deploys -> Trigger deploy -> Clear cache and deploy site.`);
    } else {
      alert('Sign in failed: ' + error.message);
    }
    isSigningIn = false;
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
