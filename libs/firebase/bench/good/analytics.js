import { getAnalytics, logEvent } from "firebase/analytics";
import { getAuth, sendSignInLinkToEmail } from "firebase/auth";
import { app } from "./app";

const analytics = getAnalytics(app);
const actionCodeSettings = { url: "https://example.com/finish", handleCodeInApp: true, linkDomain: "example.com" };

export const trackScreen = (name) => logEvent(analytics, "screen_view", { firebase_screen: name, firebase_screen_class: name });
export const sendLink = (email) => sendSignInLinkToEmail(getAuth(app), email, actionCodeSettings);
