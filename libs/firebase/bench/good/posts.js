import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "./app";

export async function loadPost(id) {
  const snap = await getDoc(doc(db, "posts", id));
  return snap.exists() ? snap.data() : null;
}

export async function loadByAuthor(authorId) {
  const q = query(collection(db, "posts"), where("authorId", "==", authorId), orderBy("createdAt"));
  return (await getDocs(q)).docs.map((d) => d.data());
}

export function watch(callback) {
  return onSnapshot(query(collection(db, "posts"), orderBy("createdAt")), (snap) => {
    callback(snap.docs.map((d) => d.data()));
  });
}
