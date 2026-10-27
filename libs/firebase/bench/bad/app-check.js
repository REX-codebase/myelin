import { initializeAppCheck } from "firebase/app-check";
import { app } from "./firebase";

export const appCheck = initializeAppCheck(app);
