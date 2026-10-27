import { initializeApp } from "firebase/app";
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";

const app = initializeApp({ projectId: "demo" });
const vertexAI = getVertexAI(app);
export const model = getGenerativeModel(vertexAI, { model: "gemini-2.5-flash" });
