import { GoogleGenAI } from "@google/genai";

// Robust check for API key availability without throwing immediately on load
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateInterviewQuestions = async (stage: string, candidateName: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI service unavailable. Please configure API_KEY.";

  try {
    const prompt = `Generate 3 concise, high-impact interview questions for a candidate named ${candidateName} who is currently in the '${stage}' stage of the hiring process. 
    If the stage is 'Classes', focus on learning potential. 
    If 'Interviews', focus on technical or behavioral skills.
    Return only the questions as a bulleted list.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate questions.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI service.";
  }
};