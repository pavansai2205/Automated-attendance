import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { firebaseConfig } from './config';

interface FirebaseAdminServices {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// This function initializes Firebase Admin SDK on the server-side.
// It's designed to be idempotent.
export function initializeFirebase(): FirebaseAdminServices {
  if (getApps().length === 0) {
    initializeApp({
        // When deployed to App Hosting, the service account is automatically
        // available. When running locally, you'll need to set the
        // GOOGLE_APPLICATION_CREDENTIALS environment variable.
    });
  }

  const app = getApp();
  const firestore = getFirestore(app);
  const auth = getAuth(app);

  return { firebaseApp: app, firestore, auth };
}
