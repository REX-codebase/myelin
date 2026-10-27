import { ReCaptchaEnterpriseProvider, initializeAppCheck } from "firebase/app-check";
import { app } from "./app";

export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider("site-key"),
  isTokenAutoRefreshEnabled: true,
});
