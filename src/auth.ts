import { initializeApp } from 'firebase/app';
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

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
      if (cachedAccessToken || !isSigningIn) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
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
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    console.error('Sign in error:', error);
    alert('Sign in failed: ' + error.message);
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
