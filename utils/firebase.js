// Firebase wiring for Google sign-in + cloud sync.
//
// To enable it, paste your Firebase web config below (Project settings >
// General > Your apps). Until it is configured the app still works fully —
// it just stores lists on this device only.
//
// Once configured, in the Firebase console enable:
//   - Authentication > Sign-in method > Google
//   - Firestore Database (create a database)
//
// Rules (Firestore):
//   match /databases/(database)/documents {
//     match /users/{uid}/data/lists {
//       allow read, write: if request.auth != null && request.auth.uid == uid;
//     }
//   }

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID",
};

export const isFirebaseConfigured =
  firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY" &&
  !firebaseConfig.apiKey.startsWith("PASTE_");

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// Subscribe to auth changes; returns the unsubscribe function.
export function onAuthChange(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => callback(user ? user : null));
}

export async function loginWithGoogle() {
  if (!auth) throw new Error("Firebase is not configured yet.");
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function logout() {
  if (auth) await signOut(auth);
}

// Push the whole list collection to the signed-in user's document.
export async function syncListsToCloud(user, lists) {
  if (!db || !user) return;
  await setDoc(doc(db, "users", user.uid, "data", "lists"), {
    lists,
    updatedAt: Date.now(),
  });
}

// Pull the signed-in user's collection. Returns null if nothing stored yet.
export async function pullListsFromCloud(user) {
  if (!db || !user) return null;
  const snap = await getDoc(doc(db, "users", user.uid, "data", "lists"));
  return snap.exists() ? snap.data().lists : null;
}
