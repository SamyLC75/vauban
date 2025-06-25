// vauban-backend/src/services/mistral.service.ts
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

interface MistralResponse {
  text: string;
  // Add other response fields if needed
}

export class MistralService {
  private apiKey = process.env.MISTRAL_API_KEY || '';
  private endpoint = 'https://api.mistral.ai/v1/generate';

  constructor() {
    if (!this.apiKey) throw new Error('MISTRAL_API_KEY manquant dans .env');
  }

  async sendPrompt(prompt: string): Promise<string> {
    const res = await axios.post(
      this.endpoint,
      {
        model: 'mistral-medium',
        prompt,
        max_tokens: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );
    return (res as { data: MistralResponse }).data.text;
  }
}
