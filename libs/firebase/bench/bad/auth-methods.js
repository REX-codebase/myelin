import { getAuth } from "firebase/auth";

const auth = getAuth();

export function signIn(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

export function signUp(email, password) {
  return auth.createUserWithEmailAndPassword(email, password);
}
