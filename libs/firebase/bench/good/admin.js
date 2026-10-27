import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

if (!getApps().length) initializeApp({ credential: applicationDefault() });

const db = getFirestore();

// Firebase Admin's Firestore keeps the chained collection().doc() API.
export async function touch(uid) {
  await db.collection("users").doc(uid).set({ lastSeen: FieldValue.serverTimestamp() }, { merge: true });
  return getAuth().getUser(uid);
}
