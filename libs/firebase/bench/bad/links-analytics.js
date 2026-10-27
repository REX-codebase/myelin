import { getAuth, sendSignInLinkToEmail } from "firebase/auth";
import { getAnalytics, setCurrentScreen } from "firebase/analytics";
import { app } from "./firebase";

const actionCodeSettings = {
  url: "https://example.com/finish",
  handleCodeInApp: true,
  dynamicLinkDomain: "example.page.link",
};

export const sendLink = (email) => sendSignInLinkToEmail(getAuth(app), email, actionCodeSettings);
export const trackScreen = (name) => setCurrentScreen(getAnalytics(app), name);
