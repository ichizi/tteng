import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StoryResponse, StoryStyle } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const storySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the story in English." },
    english: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 4-8 short English sentences suitable for a 3.5 year old. Simple grammar, repetitive patterns."
    },
    chinese: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Direct Chinese translation for each English sentence."
    },
    keywords: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          cn: { type: Type.STRING, description: "Chinese word from input" },
          en: { type: Type.STRING, description: "Corresponding English word used in story" }
        },
        required: ["cn", "en"]
      },
      description: "Keywords extracted from user input and mapped to English."
    },
    teaching_words: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          en: { type: Type.STRING, description: "The target vocabulary word" },
          note: { type: Type.STRING, description: "Simple note like 'Action word' or 'Animal'" }
        },
        required: ["en", "note"]
      },
      description: "Additional 2-3 age-appropriate core vocabulary words found in the story (e.g., colors, basic nouns)."
    },
    parent_tips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-3 short tips for parents on how to act out or teach this story (TPR tips)."
    }
  },
  required: ["title", "english", "chinese", "keywords", "teaching_words", "parent_tips"]
};

export const generateStory = async (text: string, style: StoryStyle, imageBase64?: string): Promise<StoryResponse> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const systemInstruction = `
    You are an expert English Enlightenment Teacher for children aged 3-6 (TEFL/CELTA qualified).
    Task: Create a short, engaging English story based on the user's input (and image if provided).
    Target Audience: 3.5-year-old child.
    
    Rules:
    1.  **Length**: 4 to 8 sentences total.
    2.  **Language**: Use simple words (CVC words), short sentences (max 6-8 words), and repetitive structures.
    3.  **Style**: ${style} mode.
    4.  **Content**: Incorporate the user's keywords/image content. If a keyword is too complex, simplify it (e.g., "Vehicle" -> "Car").
    5.  **Action**: Sentences should be TPR-friendly (easy to act out).
    
    Input Context: The user provides a description of a daily event in Chinese or English, and optionally an image.
  `;

  try {
    const contentParts: any[] = [];
    
    if (imageBase64) {
      // Extract base64 data if it contains the prefix
      const base64Data = imageBase64.includes('base64,') 
        ? imageBase64.split('base64,')[1] 
        : imageBase64;
        
      contentParts.push({
        inlineData: {
          mimeType: 'image/jpeg', // Defaulting to jpeg for simplicity, works for png too usually
          data: base64Data
        }
      });
      contentParts.push({ text: `Write a story based on this image and these keywords: ${text}` });
    } else {
      contentParts.push({ text: text });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: contentParts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: storySchema,
        temperature: 0.7,
      },
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("No response from Gemini.");
    }

    return JSON.parse(textResponse) as StoryResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateIllustration = async (storyTitle: string, storySummary: string): Promise<string | null> => {
  if (!apiKey) return null;

  try {
    const prompt = `A cute, child-friendly storybook illustration for a story titled "${storyTitle}". 
    Scene description: ${storySummary}. 
    Style: Soft vector art, bright colors, suitable for 3-year-olds, white background.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Using the image generation model
      contents: { parts: [{ text: prompt }] },
      config: {
        // No responseMimeType or responseSchema for image generation models
      }
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null; // Fallback will be handled by UI
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  if (!apiKey) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text }] },
      config: {
        responseModalities: ["AUDIO"] as any, 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a gentle female voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Generation Error:", error);
    return null;
  }
};
