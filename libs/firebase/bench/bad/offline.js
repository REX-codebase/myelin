import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { app } from "./firebase";

export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
  console.warn("persistence unavailable", err.code);
});
