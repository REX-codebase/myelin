import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

const app = firebase.initializeApp({ projectId: "demo" });
export const db = app.firestore();
