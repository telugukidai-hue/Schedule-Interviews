import { GoogleGenAI } from "@google/genai";

export const generateInterviewQuestions = async (stage: string, candidateName: string): Promise<string> => {
  // Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  // The API key is assumed to be available via process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    return "Could not generate AI questions at this time.";
  }
};