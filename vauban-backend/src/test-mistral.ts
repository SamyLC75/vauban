// vauban-backend/src/test-mistral.ts
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Définir les types pour Mistral
interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MistralChoice {
  index: number;
  message: MistralMessage;
  finish_reason: string;
}

interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: MistralChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function testMistral() {
  console.log('🧪 TEST MISTRAL AI');
  console.log('=================');
  
  const apiKey = process.env.MISTRAL_API_KEY;
  console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MANQUANTE');
  
  if (!apiKey) {
    console.error('❌ MISTRAL_API_KEY manquante dans .env');
    return;
  }

  try {
    console.log('\n📤 Envoi requête test à Mistral...');
    
    const response = await axios.post<MistralResponse>(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-tiny',
        messages: [
          {
            role: 'user',
            content: 'Réponds uniquement "OK" si tu fonctionnes'
          }
        ],
        temperature: 0.1,
        max_tokens: 10
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        }
      }
    );

    console.log('✅ Statut:', response.status);
    console.log('📥 Réponse:', response.data.choices[0].message.content);
    
    // Test 2 : DUER Boulangerie
    console.log('\n📤 Test génération DUER Boulangerie...');
    
    const duerResponse = await axios.post<MistralResponse>(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-tiny',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert sécurité. Réponds en JSON uniquement.'
          },
          {
            role: 'user',
            content: `Liste 3 risques principaux d'une boulangerie au format JSON:
{
  "risques": [
    {"nom": "...", "gravite": 1-4}
  ]
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        }
      }
    );

    console.log('✅ Réponse DUER:', duerResponse.data.choices[0].message.content);
    
  } catch (error: any) {
    console.error('❌ ERREUR:', error.response?.status || error.message);
    if (error.response?.data) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testMistral();
