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
    console.log('🔍 Mistral Service - API Key:', this.apiKey ? `Présente (${this.apiKey.substring(0, 8)}...)` : 'ABSENTE');
    
    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY manquante');
    }

    try {
      console.log('📤 Envoi requête à Mistral AI...');
      
      const messages: MistralMessage[] = [
        {
          role: 'system',
          content: 'Tu es un expert en sécurité au travail et réglementation française. Tu réponds TOUJOURS en JSON valide. Tu connais parfaitement les risques professionnels par secteur d\'activité.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const requestBody: any = {
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      };

      // ✅ forcer JSON si pas le modèle "tiny"
      if (!/tiny/i.test(this.model)) {
        requestBody.response_format = { type: 'json_object' };
      }

      console.log('🌐 URL:', this.endpoint);
      console.log('🔑 Headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey.substring(0, 8)}...`
      });

      const response = await axios.post(
        this.endpoint,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 30000 // 30 secondes timeout
        }
      );

      console.log('✅ Réponse Mistral reçue:', response.status);
      
      const mistralResponse = response.data as MistralResponse;
      
      if (mistralResponse.choices && mistralResponse.choices.length > 0) {
        const content = mistralResponse.choices[0].message.content || '';
        console.log('📄 Contenu reçu (100 premiers caractères):', content.substring(0, 100));

        // Extraction JSON centralisée
        const jsonCandidate = extractJsonFromText(content);

        // Valider que c'est bien du JSON
        try {
          JSON.parse(jsonCandidate);
          return jsonCandidate;
        } catch {
          console.error('⚠️ Réponse non-JSON, tentative de nettoyage...');
          // Si ce n'est pas du JSON, on retourne quand même pour debug
          console.log('Réponse brute:', content);
          return content;
        }
      }
      
      throw new Error('Réponse Mistral vide');
      
    } catch (error) {
      console.error('❌ Erreur Mistral API:', error);
      throw error;
    }
  }

  /**
   * Réponse mock pour les tests sans API key
   */
  private getMockResponse(prompt: string): string {
    throw new Error('Mode mock désactivé - MISTRAL_API_KEY requise');
  }
}