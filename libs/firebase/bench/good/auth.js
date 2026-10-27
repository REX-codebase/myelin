import { GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "./app";

export const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signInGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const watchUser = (cb) => onAuthStateChanged(auth, cb);
export const logOut = () => signOut(auth);
