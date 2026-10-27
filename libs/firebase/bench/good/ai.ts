import { initializeApp } from "firebase/app";
import { AgentPlatformBackend, GoogleAIBackend, getAI, getGenerativeModel } from "firebase/ai";

const app = initializeApp({ projectId: "demo", apiKey: "key" });

const studio = getAI(app, { backend: new GoogleAIBackend() });
const enterprise = getAI(app, { backend: new AgentPlatformBackend("global") });

export const quick = getGenerativeModel(studio, { model: "gemini-3.5-flash-lite" });
export const governed = getGenerativeModel(enterprise, { model: "gemini-3.5-flash-lite" });
