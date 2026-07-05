import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import defaultFirebaseConfig from '../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
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
  const provider = isAdmin ? adminProvider : customerProvider;
  try {
    isSigningIn = true;
    
    // Attempt popup sign in first
    const result = await signInWithPopup(auth, provider);
    
    if (isAdmin && result && result.providerId === adminProvider.providerId) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
    }
    isSigningIn = false;
  } catch (error: any) {
    console.warn('Sign in with popup failed or was blocked. Error:', error);
    
    const isPopupBlocked = error.code === 'auth/popup-blocked' || 
                           error.message?.includes('popup-blocked') || 
                           error.message?.includes('popup');
                           
    if (isPopupBlocked) {
      console.log('Popup blocked. Attempting fallback to signInWithRedirect...');
      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        console.error('Redirect fallback also failed:', redirectError);
      }
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
