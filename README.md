# Shopping List (Expo / React Native)

A shopping-list app in the same style as **Child Genius** (React Native + Expo,
React Navigation, AsyncStorage, colorful card UI).

## Features
- **Home** — create a new shopping list, plus a list of your existing lists
  (each shows its title, or "Untitled list", and its date).
- **List editor** — a single vertical page of expandable/collapsible
  **accordions**, one per supermarket section:
  - Fruits & Veggies, Butter & Cheese, Dairy, Bread, Tea/Coffee & Cereals,
    Soaps/Shampoo/Toothpaste, Laundry & Dishwash, Frozen.
  - Add items to any section, tick them off, delete them.
  - Open/collapse any accordion.
  - **Add a new section** with your own title.
- **Local storage** — everything is saved on the device with AsyncStorage
  (works offline, no account needed).
- **Google sign-in + cloud sync** — sign in with your Google/Gmail account and
  your lists are stored in Firebase Firestore, so the same lists appear when you
  sign in on another phone.

## Run it
```bash
npm install
npx expo start
```
Then scan the QR with the Expo Go app (or press `a` for Android / `i` for iOS).

> Note: Google sign-in requires a **native build** (Expo Go does not support
> Google's in-app popup). For a quick test you can use a dev build
> (`npx expo run:android` / `npx expo run:ios`). Local lists work everywhere.

## Enable Google login + cross-device sync
1. Create a project at https://console.firebase.google.com.
2. Add a **Web app** and copy its config into `utils/firebase.js`
   (`firebaseConfig`).
3. **Authentication → Sign-in method → Google**: enable, add your email.
4. **Firestore Database → Create database** (start in test mode, then lock it).
5. Set Firestore **rules** so only the owner can read/write their own data:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/data/lists {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
Until `firebaseConfig` is filled in, the app runs in local-only mode and the
"Sign in" button is hidden.
