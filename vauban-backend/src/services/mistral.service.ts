// vauban-backend/src/services/mistral.service.ts
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

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
      console.warn('⚠️ Mistral API key manquante - retour en mode mock');
      return this.getMockResponse(prompt);
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

      const requestBody = {
        model: 'mistral-tiny', // Modèle gratuit
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        // Note: response_format n'est pas supporté par mistral-tiny
      };

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
        const content = mistralResponse.choices[0].message.content;
        console.log('📄 Contenu reçu (100 premiers caractères):', content.substring(0, 100));
        
        // Essayer de nettoyer la réponse si elle contient du texte avant le JSON
        let jsonContent = content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonContent = jsonMatch[0];
        }
        
        // Vérifier que c'est du JSON valide
        try {
          JSON.parse(jsonContent);
          return jsonContent;
        } catch (e) {
          console.error('⚠️ Réponse non-JSON, tentative de nettoyage...');
          // Si ce n'est pas du JSON, on retourne quand même pour debug
          console.log('Réponse brute:', content);
          return content;
        }
      }
      
      throw new Error('Réponse Mistral vide');
      
    } catch (error) {
      console.error('❌ Erreur Mistral API:', error);
      
      if (error instanceof Error && 'response' in error && error.response) {
        const response = error.response as { status: number; data: any };
        if (response.status === 401) {
          console.error('❌ Clé API invalide ou expirée');
          console.error('Détails:', response.data);
        } else if (response.status === 429) {
          console.error('❌ Trop de requêtes (rate limit)');
        } else {
          console.error('❌ Erreur API:', response.status, response.data);
        }
      } else {
        console.error('❌ Erreur réseau ou autre:', error);
      }
      
      console.log('⚠️ Basculement sur mode mock suite à erreur');
      return this.getMockResponse(prompt);
    }
  }

  /**
   * Réponse mock pour les tests sans API key
   */
  private getMockResponse(prompt: string): string {
    if (prompt.includes('questions')) {
      return JSON.stringify({
        questions: [
          {
            id: 'Q1',
            question: 'Votre entreprise utilise-t-elle des machines ou équipements dangereux?',
            type: 'oui_non',
            justification: 'Évaluer les risques mécaniques',
            impact: 'Mesures de protection machines'
          },
          {
            id: 'Q2',
            question: 'Y a-t-il exposition à des produits chimiques?',
            type: 'oui_non',
            justification: 'Risque chimique à évaluer',
            impact: 'FDS et EPI nécessaires'
          },
          {
            id: 'Q3',
            question: 'Vos salariés travaillent-ils seuls parfois?',
            type: 'oui_non',
            justification: 'Travailleur isolé',
            impact: 'Dispositif PTI/DATI requis'
          }
        ]
      });
    }
    
    if (prompt.includes('DUER')) {
      return JSON.stringify({
        duer: {
          secteur: 'Demo',
          date_generation: new Date().toISOString(),
          unites: [{
            nom: 'Unité Demo',
            risques: [
              {
                id: 'R001',
                danger: 'Chute de plain-pied',
                situation: 'Circulation dans les locaux',
                gravite: 2,
                probabilite: 3,
                priorite: 6,
                mesures_existantes: ['Sol maintenu propre'],
                mesures_proposees: [{
                  type: 'collective',
                  description: 'Améliorer éclairage',
                  delai: 'court_terme',
                  cout_estime: '€',
                  reference: 'INRS ED 950'
                }],
                suivi: {
                  responsable: 'Responsable HSE',
                  echeance: '3 mois',
                  indicateur: 'Nb incidents'
                }
              }
            ]
          }],
          synthese: {
            nb_risques_critiques: 0,
            nb_risques_importants: 1,
            nb_risques_moderes: 0,
            top_3_priorites: ['Chute de plain-pied'],
            budget_prevention_estime: '500-1000€',
            conformite_reglementaire: {
              points_forts: ['DUER établi'],
              points_vigilance: ['Formation à prévoir']
            }
          }
        }
      });
    }
    
    return JSON.stringify({
      message: 'Mode demo - Mistral API non configurée'
    });
  }
}