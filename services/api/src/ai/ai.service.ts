import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AiService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY || '';
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';
  }

  async chat(message: string, userId?: string): Promise<{ response: string }> {
    if (!this.apiKey) {
      return { response: 'AI not configured.' };
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{ text: `You are a pregnancy health assistant. Answer briefly (2-3 sentences): ${message}. Always end with "Consult your doctor."` }],
          }],
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      return { response: response.data.candidates[0].content.parts[0].text };
    } catch (error) {
      console.error('AI Error:', error.response?.data || error.message);
      return { response: 'I\'m temporarily unavailable. Use Emergency SOS for urgent concerns.' };
    }
  }
}
