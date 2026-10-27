import { initializeApp } from "firebase/app";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const app = initializeApp({ apiKey: "key", projectId: "demo" });
export const db = getFirestore(app);
export const auth = getAuth(app);
export const stamp = serverTimestamp();
