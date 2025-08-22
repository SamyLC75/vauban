// src/services/mistral.service.ts
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

// ---- Helper: extraction JSON robuste depuis un texte IA ----
function extractJsonFromText(content: string): string {
  if (!content) return content;
  let txt = content.trim();

  // Enlever les fences ```json ... ```
  if (txt.startsWith('```')) {
    txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }

  // Isoler le 1er bloc { ... } si du texte parasite
  const m = txt.match(/\{[\s\S]*\}/);
  if (m) return m[0];

  return txt;
}

interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class MistralService {
  private apiKey = process.env.MISTRAL_API_KEY || '';
  private endpoint = 'https://api.mistral.ai/v1/chat/completions';

  // ✅ lis le modèle & paramètres depuis l'env
  private model = process.env.MISTRAL_MODEL || 'mistral-small';
  private temperature = Number(process.env.MISTRAL_TEMPERATURE ?? 0.7);
  private maxTokens = Number(process.env.MISTRAL_MAX_TOKENS ?? 4000);

  constructor() {
    if (!this.apiKey) {
      console.error('⚠️  MISTRAL_API_KEY manquant dans .env');
      console.log('Pour obtenir une clé API gratuite:');
      console.log('1. Va sur https://console.mistral.ai');
      console.log('2. Crée un compte');
      console.log('3. Génère une clé API');
      console.log('4. Ajoute MISTRAL_API_KEY=ta_clé dans .env');
    }
  }

  async sendPrompt(prompt: string): Promise<string> {
    console.log(' Mistral Service - API Key:', this.apiKey ? `Présente (${this.apiKey.substring(0, 8)}...)` : 'ABSENTE');
    
    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY manquante');
    }

    // ---- Politique de retry/fallback ----
    const modelsFallback = [
      this.model,
      'mistral-small',
      'open-mistral-7b',
    ].filter((v, i, a) => !!v && a.indexOf(v) === i);

    const mistralTimeout = Number(process.env.MISTRAL_TIMEOUT_MS ?? 60000); // 60s par défaut
    const baseMaxTokens = this.maxTokens;
    const baseTemp = this.temperature;

    let lastErr: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const delay = attempt === 0 ? 0 : [500, 1200, 2500][Math.min(attempt, 2)];
      if (delay) await new Promise(r => setTimeout(r, delay));

      const model = modelsFallback[Math.min(attempt, modelsFallback.length - 1)];
      const max_tokens = Math.max(800, Math.floor(baseMaxTokens * (attempt === 0 ? 1.0 : attempt === 1 ? 0.75 : 0.6)));
      const temperature = attempt > 0 ? Math.min(0.8, baseTemp) : baseTemp;

      try {
        console.log(` Mistral try#${attempt+1} model=${model} max_tokens=${max_tokens}`);
        
        const messages: MistralMessage[] = [
          {
            role: 'system',
            content: 'Tu es un expert en sécurité au travail et réglementation française. Tu réponds TOUJOURS en JSON valide. Tu connais parfaitement les risques professionnels par secteur d\'activité.'
          },
          { role: 'user', content: prompt }
        ];

        const requestBody: any = {
          model,
          messages,
          temperature,
          max_tokens,
          response_format: { type: 'json_object' }, // forcer JSON
        };

        const response = await axios.post(
          this.endpoint,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            timeout: mistralTimeout,
            timeoutErrorMessage: 'Mistral timeout'
          }
        );

        console.log(' Réponse Mistral reçue:', response.status);
        const mistralResponse = response.data as MistralResponse;
        
        if (mistralResponse.choices && mistralResponse.choices.length > 0) {
          const content = mistralResponse.choices[0].message.content || '';
          console.log(' Contenu reçu (100 premiers caractères):', content.substring(0, 100));
          
          // Extraction et validation JSON
          const jsonCandidate = extractJsonFromText(content);
          try { 
            JSON.parse(jsonCandidate); 
            return jsonCandidate; 
          } catch {
            console.error(' Réponse non-JSON, tentative de nettoyage…');
            return content; // debug aid
          }
        }
        throw new Error('Réponse Mistral vide');
        
      } catch (error: any) {
        lastErr = error;
        const status = error?.response?.status;
        const code = error?.code || error?.response?.data?.code;
        console.warn(` Mistral erreur (try#${attempt+1}) status=${status} code=${code} msg=${error?.message}`);
        
        // 429 / timeout -> retry
        if (status === 429 || /timeout/i.test(String(error?.message))) {
          continue;
        }
        // autres erreurs: ne pas insister
        break;
      }
    }
    
    console.error(' Erreur Mistral API après retries:', lastErr);
    throw lastErr;
  }

  /**
   * Réponse mock pour les tests sans API key
   */
  private getMockResponse(prompt: string): string {
    throw new Error('Mode mock désactivé - MISTRAL_API_KEY requise');
  }
}