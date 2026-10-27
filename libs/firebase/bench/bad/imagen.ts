import { getAI, getImagenModel, GoogleAIBackend } from "firebase/ai";
import { app } from "./firebase";

const ai = getAI(app, { backend: new GoogleAIBackend() });
export const imagen = getImagenModel(ai, { model: "imagen-3.0-generate-002" });
