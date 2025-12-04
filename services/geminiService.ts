import { GoogleGenAI } from "@google/genai";

export const generateInterviewQuestions = async (stage: string, candidateName: string): Promise<string> => {
  // Check if API key is present before attempting to use it
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey.length === 0) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return "AI generation is disabled. Please configure the API_KEY.";
  }

  const ai = new GoogleGenAI({ apiKey });

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
    return "Could not generate AI questions at this time. Please check API configuration.";
  }
};