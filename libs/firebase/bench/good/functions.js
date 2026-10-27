import { onCall, onRequest } from "firebase-functions/https";
import { onDocumentCreated } from "firebase-functions/firestore";
import { onSchedule } from "firebase-functions/scheduler";
import { defineString } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/options";

setGlobalOptions({ region: "europe-west1" });

const greeting = defineString("GREETING", { default: "Hello" });

export const hello = onRequest((req, res) => res.send(greeting.value()));
export const echo = onCall((request) => ({ uid: request.auth?.uid ?? null, data: request.data }));
export const created = onDocumentCreated("posts/{postId}", (event) => console.log(event.params.postId));
export const nightly = onSchedule("every day 03:00", () => {});
