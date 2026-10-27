import { getFirestore } from "firebase/firestore";
import { app } from "./firebase";

const db = getFirestore(app);

export async function loadPost(id) {
  const snap = await db.collection("posts").doc(id).get();
  return snap.exists ? snap.data() : null;
}

export function watch(callback) {
  return db.collection("posts").orderBy("createdAt").onSnapshot((snap) => {
    callback(snap.docs.map((d) => d.data()));
  });
}
