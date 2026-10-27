import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

firebase.initializeApp({ apiKey: "key", projectId: "demo" });

export const db = firebase.firestore();
export const auth = firebase.auth();
export const stamp = firebase.firestore.FieldValue.serverTimestamp();
