// vauban-backend/src/controllers/duer.controller.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DUERPromptsService } from '../services/duer-prompts.service';
import { MistralService } from '../services/mistral.service';

const duerPrompts = new DUERPromptsService();
const mistral = new MistralService();

// Stockage temporaire en mémoire (remplacer par DB)
const duerStorage = new Map<string, any>();

/**
 * POST /api/duer/ia-questions
 * Génère des questions pour affiner le DUER
 */
export const generateQuestions = async (req: AuthRequest, res: Response) => {
  console.log('🚨 DUER generateQuestions appelé!');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  try {
    const { sector, size } = req.body;
    
    if (!sector || !size) {
      return res.status(400).json({ 
        error: 'Secteur et taille requis' 
      });
    }

    const prompt = duerPrompts.getQuestionsPrompt(sector, size);
    const response = await mistral.sendPrompt(prompt);
    
    try {
      const questions = JSON.parse(response);
      return res.json(questions);
    } catch (parseError) {
      console.error('Erreur parsing questions:', response);
      // Fallback avec questions par défaut
      return res.json({
        questions: [
          {
            id: 'Q1',
            question: 'Votre entreprise manipule-t-elle des charges lourdes (>10kg) régulièrement?',
            type: 'oui_non',
            justification: 'Évaluer les risques de TMS et manutention',
            impact: 'Ajout de risques liés au port de charges'
          },
          {
            id: 'Q2', 
            question: 'Y a-t-il du travail en hauteur (>2m)?',
            type: 'oui_non',
            justification: 'Risque de chute grave',
            impact: 'Mesures anti-chute obligatoires'
          },
          {
            id: 'Q3',
            question: 'Quels types de produits chimiques utilisez-vous?',
            type: 'texte',
            justification: 'Évaluation risque chimique',
            impact: 'FDS et mesures de protection spécifiques'
          }
        ]
      });
    }
  } catch (error) {
    console.error('Erreur génération questions:', error);
    return res.status(500).json({ 
      error: 'Erreur génération questions',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * POST /api/duer/ia-generate
 * Génère le DUER complet avec l'IA
 */
export const generateDUER = async (req: AuthRequest, res: Response) => {
  console.log('🚨 DUER generateDUER appelé!');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('User:', req.user);
  try {
    const { sector, size, unites, historique, contraintes, reponses } = req.body;
    
    // Validation minimale
    if (!sector || !size || !unites || unites.length === 0) {
      return res.status(400).json({ 
        error: 'Données insuffisantes. Secteur, taille et unités requis.' 
      });
    }

    console.log('🎯 Génération DUER pour:', { sector, size, unites });

    // Enrichir le contexte avec les réponses aux questions
    let contextEnrichi = { sector, size, unites, historique, contraintes };
    if (reponses) {
      contextEnrichi.contraintes = `${contraintes || ''} ${JSON.stringify(reponses)}`;
    }

    const prompt = duerPrompts.getDUERGenerationPrompt(contextEnrichi);
    console.log('📝 Prompt length:', prompt.length);
    
    const response = await mistral.sendPrompt(prompt);
    console.log('📥 Réponse Mistral length:', response.length);
    
    try {
      // Nettoyer la réponse si elle contient du texte avant le JSON
      let jsonResponse = response;
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonResponse = jsonMatch[0];
      }
      
      const duerGenere = JSON.parse(jsonResponse);
      
      // Vérifier que la structure est correcte
      if (!duerGenere.duer || !duerGenere.duer.unites) {
        throw new Error('Structure DUER invalide');
      }
      
      // Sauvegarder en mémoire avec un ID unique
      const duerId = `DUER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      duerStorage.set(duerId, {
        ...duerGenere,
        id: duerId,
        dateCreation: new Date().toISOString(),
        orgCode: req.body.orgCode || 'DEMO'
      });
      
      console.log('✅ DUER généré avec succès:', duerId);
      
      return res.json({
        success: true,
        duerId,
        duer: duerGenere,
        debug: {
          modelUsed: 'mistral-tiny',
          promptLength: prompt.length,
          responseLength: response.length
        }
      });
      
    } catch (parseError) {
      console.error('❌ Erreur parsing DUER:', parseError);
      console.log('📄 Réponse brute (200 premiers caractères):', response.substring(0, 200));
      
      // Si c'est pas du JSON, essayer de comprendre pourquoi
      if (response.includes('Je ne peux pas') || response.includes('désolé')) {
        return res.status(400).json({
          error: 'L\'IA a refusé de générer le DUER',
          message: response,
          suggestion: 'Essayez avec un secteur plus spécifique'
        });
      }
      
      // Générer un DUER minimal de secours spécifique au secteur
      const duerMinimal = generateMinimalDUER(sector, size, unites);
      return res.json({
        success: true,
        duerId: 'DUER-MINIMAL-' + Date.now(),
        duer: duerMinimal,
        warning: 'DUER généré en mode dégradé (erreur parsing IA)'
      });
    }
  } catch (error) {
    console.error('❌ Erreur génération DUER:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la génération du DUER',
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      suggestion: 'Vérifiez la configuration Mistral AI'
    });
  }
};

/**
 * GET /api/duer/:id
 * Récupère un DUER existant
 */
export const getDUER = async (req: Request, res: Response) => {
  const { id } = req.params;
  const duer = duerStorage.get(id);
  
  if (!duer) {
    return res.status(404).json({ error: 'DUER non trouvé' });
  }
  
  return res.json(duer);
};

/**
 * POST /api/duer/ia-explain
 * Explique un risque spécifique
 */
export const explainRisk = async (req: Request, res: Response) => {
  try {
    const { risque } = req.body;
    
    if (!risque || !risque.danger) {
      return res.status(400).json({ 
        error: 'Données du risque requises' 
      });
    }

    const prompt = duerPrompts.getExplanationPrompt(risque);
    const response = await mistral.sendPrompt(prompt);
    
    try {
      const explication = JSON.parse(response);
      return res.json(explication);
    } catch {
      // Fallback avec explication basique
      return res.json({
        explication: {
          resume_simple: `Le risque "${risque.danger}" nécessite une attention particulière dans votre secteur.`,
          statistiques: 'Données statistiques non disponibles',
          exemple_accident: 'Consultez les retours d\'expérience de votre branche',
          reference_principale: 'Code du travail Art. R4121-1 et suivants',
          conseil_pratique: 'Effectuez une analyse de risque détaillée avec vos équipes'
        }
      });
    }
  } catch (error) {
    console.error('Erreur explication risque:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de l\'explication du risque' 
    });
  }
};

/**
 * PUT /api/duer/:id/update
 * Met à jour un DUER existant
 */
export const updateDUER = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { changement } = req.body;
    
    const duerExistant = duerStorage.get(id);
    if (!duerExistant) {
      return res.status(404).json({ error: 'DUER non trouvé' });
    }

    const prompt = duerPrompts.getUpdatePrompt(duerExistant, changement);
    const response = await mistral.sendPrompt(prompt);
    
    // Fusionner les modifications
    const modifications = JSON.parse(response);
    const duerMisAJour = {
      ...duerExistant,
      ...modifications,
      dateModification: new Date().toISOString(),
      historique: [
        ...(duerExistant.historique || []),
        {
          date: new Date().toISOString(),
          type: changement.type,
          description: changement.details
        }
      ]
    };
    
    duerStorage.set(id, duerMisAJour);
    
    return res.json({
      success: true,
      duer: duerMisAJour
    });
  } catch (error) {
    console.error('Erreur mise à jour DUER:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du DUER' 
    });
  }
};

/**
 * POST /api/duer/ia-measures
 * Génère des mesures innovantes pour un risque
 */
export const generateInnovativeMeasures = async (req: Request, res: Response) => {
  try {
    const { risque, budget } = req.body;
    
    const prompt = duerPrompts.getMesuresInnovantesPrompt(risque, budget || '€€');
    const response = await mistral.sendPrompt(prompt);
    
    const mesures = JSON.parse(response);
    return res.json(mesures);
  } catch (error) {
    console.error('Erreur génération mesures:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la génération des mesures' 
    });
  }
};

// Fonction helper pour générer un DUER minimal
function generateMinimalDUER(sector: string, size: string, unites: string[]) {
  return {
    duer: {
      secteur: sector,
      date_generation: new Date().toISOString(),
      unites: unites.map(unite => ({
        nom: unite,
        risques: [
          {
            id: 'R001',
            danger: 'Risque de chute de plain-pied',
            situation: 'Circulation dans les locaux',
            gravite: 2,
            probabilite: 3,
            priorite: 6,
            mesures_existantes: ['Sol maintenu propre'],
            mesures_proposees: [{
              type: 'collective',
              description: 'Installer un éclairage adapté',
              delai: 'court_terme',
              cout_estime: '€',
              reference: 'INRS ED 950'
            }],
            suivi: {
              responsable: 'Responsable sécurité',
              echeance: '3 mois',
              indicateur: 'Nombre de chutes'
            }
          }
        ]
      })),
      synthese: {
        nb_risques_critiques: 0,
        nb_risques_importants: 1,
        nb_risques_moderes: 0,
        top_3_priorites: ['Risque de chute'],
        budget_prevention_estime: '500-1000€',
        conformite_reglementaire: {
          points_forts: ['DUER créé'],
          points_vigilance: ['À compléter avec analyse terrain']
        }
      }
    }
  };
}