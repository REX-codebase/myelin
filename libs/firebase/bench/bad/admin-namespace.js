import * as admin from "firebase-admin";

admin.initializeApp({ credential: admin.credential.applicationDefault() });

export const db = admin.firestore();
export const stamp = admin.firestore.FieldValue.serverTimestamp();

export function verify(token) {
  return admin.auth().verifyIdToken(token);
}
