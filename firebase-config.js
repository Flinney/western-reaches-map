// ---------------------------------------------------------------------------
// Firebase settings for the Western Reaches map.
//
// These values are SAFE to commit and to serve publicly — a Firebase web
// config is not a secret. What protects your data is the Firestore security
// rules (see README.md), NOT hiding these keys.
//
// HOW TO FILL THIS IN (full walkthrough in README.md):
//   1. Create a Firebase project at https://console.firebase.google.com
//   2. Add a Web app; Firebase shows you a config object like the one below.
//   3. Paste those values here, replacing every "YOUR_..." placeholder.
//   4. Create your GM login (Authentication > Email/Password) and paste your
//      user's UID into GM_UID below.
//
// Until real values are in place, the map runs in DEMO MODE: the base map
// shows under full fog, read-only, with no reveals and no login.
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "AIzaSyBb6mcaVfYoPTHEYbO88GUHxu-IhGi61sE",
  authDomain: "western-reaches.firebaseapp.com",
  projectId: "western-reaches",
  storageBucket: "western-reaches.firebasestorage.app",
  messagingSenderId: "105483290128",
  appId: "1:105483290128:web:e2e320848b3e2482082c95"
};

// The Firebase Auth UID of the GM account. Find it under
// Authentication > Users in the Firebase console after you create your login.
// Leave as "YOUR_GM_UID" during setup — while it's a placeholder, any
// signed-in user is treated as GM so you can do the first POI import; lock it
// to your real UID before sharing the link.
export const GM_UID = "YOUR_GM_UID";
