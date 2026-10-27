import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, VertexAIBackend } from "firebase/ai";

const app = initializeApp({ projectId: "demo" });
const ai = getAI(app, { backend: new VertexAIBackend("us-central1") });
export const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
