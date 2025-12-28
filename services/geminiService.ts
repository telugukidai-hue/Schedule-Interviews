
import { GoogleGenAI } from "@google/genai";

/**
 * Generates interview questions using Gemini 3.
 * Follows strict @google/genai SDK guidelines for initialization and usage.
 */
export const generateInterviewQuestions = async (stage: string, candidateName: string): Promise<string> => {
  // Always use process.env.API_KEY directly when initializing the GoogleGenAI client.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `Generate 3 concise, high-impact interview questions for a candidate named ${candidateName} who is currently in the '${stage}' stage of the hiring process. 
    If the stage is 'Classes', focus on learning potential. 
    If 'Interviews', focus on technical or behavioral skills.
    Return only the questions as a bulleted list.`;

    // Fixed: Using the recommended model 'gemini-3-flash-preview' for basic text tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Directly access the .text property from GenerateContentResponse.
    return response.text || "Could not generate questions.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not generate AI questions at this time.";
  }
};
