
import { GoogleGenAI, Type, Modality } from "@google/genai";

export class GeminiService {
  constructor() {}

  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async suggestArchitecture(objective: string) {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Build a powerful high-conversion architecture for: "${objective}". 
      Return ONLY a comma-separated list of IDs from these: hero-1, hero-v, feat-grid, logos, pricing.
      Choose at least 3-4 components in a logical order (e.g., hero, features, trust, conversion).`,
      config: {
        systemInstruction: "You are a master of conversion rate optimization (CRO). Your goal is to select the most powerful structure for any business objective.",
      }
    });
    return response.text?.split(',').map(s => s.trim()) || ['hero-1', 'feat-grid', 'pricing'];
  }

  async generateStylePreview(style: string, objective: string) {
    const ai = this.getAI();
    const prompt = `A cinematic, ultra-high-fidelity web design dashboard/moodboard for "${objective}". Style: ${style}. High contrast, professional marketing art, 8k resolution, minimalist but powerful UI elements.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  }

  async generateBase44Prompt(project: any) {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Act as a senior full-stack engineer. Generate a technical Base44 specification for this project: ${JSON.stringify(project)}. Include copywriting hooks, database schema, and technical stack recommendations.`,
      config: {
        thinkingConfig: { thinkingBudget: 16000 },
        systemInstruction: "Format the output as a professional technical brief with sections for Copywriting, Architecture, and Data Schema.",
      }
    });
    return response.text;
  }

  connectAssistant(callbacks: {
    onopen: () => void;
    onmessage: (msg: any) => void;
    onerror: (e: any) => void;
    onclose: () => void;
  }) {
    const ai = this.getAI();
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: 'You are the Hero45 Intelligence. You help users generate powerful landing pages with minimal commands. You are concise, tech-focused, and extremely smart.',
      },
    });
  }
}

export const gemini = new GeminiService();
