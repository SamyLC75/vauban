export class DUERPromptsService {
  /**
   * Génère des questions pour affiner le DUER
   * Format strict JSON avec types limités à oui_non et texte
   */
  getQuestionsPrompt(sector: string, size: string): string {
    return `En tant qu'expert DUER, pose 3-5 questions ESSENTIELLES pour affiner l'évaluation des risques d'une ${size} du secteur ${sector}.

Format JSON strict:
{
  "questions": [
    {
      "id": "Q1",
      "question": "Question claire et directe",
      "type": "oui_non|texte",
      "justification": "Pourquoi cette info est cruciale",
      "impact": "Ce que ça change dans le DUER"
    }
  ]
}

Contraintes:
- UNIQUEMENT le JSON (pas de texte autour, pas de \`\`\`json).
- id unique (Q1, Q2, ...).
- type ∈ { "oui_non", "texte" } (pas d'autres types).`;
  }


  /**
   * Génère le prompt principal pour créer un DUER
   * JAMAIS de données sensibles, seulement contexte anonymisé
   */
  getDUERGenerationPrompt(context: {
    sector: string;
    size: 'TPE' | 'PME' | 'ETI';
    unites: string[];
    historique?: string;
    contraintes?: string;
  }): string {
    const contexteSectoriel = this.getContexteSectoriel(context.sector);
    
    return `Tu es un expert en prévention des risques professionnels et en rédaction de DUER selon la réglementation française.

CONTEXTE ENTREPRISE (ANONYMISÉ):
- Secteur d'activité: ${context.sector}
- Taille: ${context.size} (${this.getSizeRange(context.size)} salariés)
- Unités de travail: ${context.unites.join(', ')}
${context.historique ? `- Historique accidents: ${context.historique}` : ''}
${context.contraintes ? `- Contraintes spécifiques: ${context.contraintes}` : ''}

CONNAISSANCES SECTORIELLES SPÉCIFIQUES:
${contexteSectoriel}

MISSION:
Génère un DUER (Document Unique d'Évaluation des Risques) TRÈS SPÉCIFIQUE au secteur ${context.sector}, structuré en JSON.

RÈGLES CRITIQUES:
1. Les risques doivent être SPÉCIFIQUES à chaque unité de travail (PAS de copier-coller)
2. Pour une boulangerie: pense aux fours, farines, charges lourdes, horaires décalés, etc.
3. Pour chaque unité, identifie les risques RÉELS du métier
4. Priorise selon gravité ET probabilité (score = gravité × probabilité)
5. Mesures concrètes et applicables en PME avec coûts réalistes
6. Cite les références réglementaires pertinentes

FORMAT DE SORTIE OBLIGATOIRE (JSON STRICT):
{
  "duer": {
    "secteur": "${context.sector}",
    "date_generation": "2024-01-20",
    "unites": [
      {
        "nom": "nom_unite",
        "risques": [
          {
            "id": "R001",
            "danger": "Description PRÉCISE et SPÉCIFIQUE du danger",
            "situation": "Situation réelle d'exposition dans cette unité",
            "gravite": 1-4,
            "probabilite": 1-4,
            "priorite": "gravite × probabilite",
            "mesures_existantes": ["mesures déjà en place"],
            "mesures_proposees": [
              {
                "type": "collective|individuelle|formation",
                "description": "Mesure concrète et réaliste",
                "delai": "immédiat|court_terme|moyen_terme",
                "cout_estime": "€|€€|€€€",
                "reference": "Article Code travail ou guide INRS"
              }
            ],
            "suivi": {
              "responsable": "fonction dans l'entreprise",
              "echeance": "3 mois|6 mois|1 an",
              "indicateur": "KPI mesurable"
            }
          }
        ]
      }
    ],
    "synthese": {
      "nb_risques_critiques": nombre,
      "nb_risques_importants": nombre,
      "nb_risques_moderes": nombre,
      "top_3_priorites": ["risque le plus grave", "2e", "3e"],
      "budget_prevention_estime": "X-Y€",
      "conformite_reglementaire": {
        "points_forts": ["ce qui est déjà bien"],
        "points_vigilance": ["ce qui doit être amélioré"]
      }
    }
  }
}

ATTENTION: Génère des risques DIFFÉRENTS et PERTINENTS pour chaque unité. Pas de TMS écran dans un fournil !`;
  }

  private getContexteSectoriel(secteur: string): string {
    const contextesParSecteur: Record<string, string> = {
      'boulangerie': `
RISQUES SPÉCIFIQUES BOULANGERIE-PÂTISSERIE:
- Fournil: brûlures (four 250°C), TMS port sacs farine 25kg, asthme du boulanger (poussières farine), coupures (lames), glissades sol humide
- Laboratoire pâtisserie: brûlures, coupures (ustensiles tranchants), TMS (gestes répétitifs pochage), allergies
- Magasin: station debout prolongée, agression/vol (espèces), TMS caisse
- Stockage: chutes de hauteur (étagères), écrasement (chute objets), TMS manutention
ÉQUIPEMENTS TYPIQUES: Four, pétrin, laminoir, batteur, chambre de pousse, chambre froide
HORAIRES: Souvent 3h-11h, week-ends et jours fériés`,
      
      'garage': `
RISQUES SPÉCIFIQUES GARAGE AUTOMOBILE:
- Atelier: écrasement (véhicule/pont), chute en fosse, TMS postures contraintes, produits chimiques (huiles, solvants)
- Carrosserie: risque chimique (peintures, mastics), bruit, poussières, incendie/explosion
- Accueil: agression clients mécontents, TMS bureau
ÉQUIPEMENTS: Ponts élévateurs, fosses, compresseurs, postes à souder`,
      
      'restaurant': `
RISQUES SPÉCIFIQUES RESTAURATION:
- Cuisine: brûlures, coupures, glissades sol gras, TMS, stress rush service
- Salle: TMS port plateaux, agression clients, station debout
- Plonge: dermatoses, TMS, glissades
- Cave: chutes escaliers, port charges lourdes (caisses), alcool`,
      
      'bureau': `
RISQUES SPÉCIFIQUES TERTIAIRE/BUREAU:
- Open space: TMS écran, fatigue visuelle, bruit ambiant, qualité air, RPS
- Archives: chutes hauteur, port charges, poussières
- Accueil: agression verbale, stress`,
      
      'default': `
ANALYSEZ LE SECTEUR SPÉCIFIQUE ET SES RISQUES PROPRES.
Pensez aux équipements utilisés, aux produits manipulés, aux postures de travail.`
    };

    // Recherche avec correspondance partielle
    const secteurLower = secteur.toLowerCase();
    for (const [key, value] of Object.entries(contextesParSecteur)) {
      if (secteurLower.includes(key) || key.includes(secteurLower)) {
        return value;
      }
    }
    
    return contextesParSecteur.default;
  }

  /**
      "id": "Q1",
      "question": "Question claire et directe",
      "type": "choix_multiple|oui_non|texte",
      "options": ["option1", "option2"],
      "justification": "Pourquoi cette info est cruciale",
      "impact": "Ce que ça change dans le DUER"
    }
  ]
}`;
  }

  /**
   * Prompt pour expliquer un risque spécifique
   */
  getExplanationPrompt(risque: any): string {
    return `Explique de façon claire et pédagogique ce risque professionnel:
    
Danger: ${risque.danger}
Situation: ${risque.situation}
Secteur: ${risque.secteur || 'Non spécifié'}

Fournis:
1. Explication vulgarisée (2-3 phrases simples)
2. Statistiques sectorielles si disponibles
3. Exemple concret d'accident type
4. Référence réglementaire principale
5. Bonne pratique simple à mettre en œuvre

Format JSON:
{
  "explication": {
    "resume_simple": "texte",
    "statistiques": "X% accidents dans ce secteur...",
    "exemple_accident": "description",
    "reference_principale": "Article/Guide INRS",
    "conseil_pratique": "action_immediate"
  }
}`;
  }

  /**
   * Prompt pour mise à jour partielle du DUER
   */
  getUpdatePrompt(
    duerExistant: any,
    changement: {
      type: 'nouvelle_unite' | 'nouvel_equipement' | 'accident' | 'modification_process';
      details: string;
    }
  ): string {
    return `DUER existant à mettre à jour suite à: ${changement.type}
Détails: ${changement.details}

Analyse l'impact et propose UNIQUEMENT les modifications nécessaires.
Retourne seulement les risques nouveaux ou modifiés au format standard.`;
  }

  /**
   * Prompt pour générer des mesures correctives innovantes
   */
  getMesuresInnovantesPrompt(risque: any, budget: string): string {
    return `Pour ce risque: ${risque.danger}
Budget disponible: ${budget}

Propose 3-5 mesures de prévention INNOVANTES et ADAPTÉES PME:
- Solutions low-tech privilégiées
- ROI rapide (< 12 mois)
- Facilité mise en œuvre
- Impact collectif maximal

Format JSON avec justification coût/bénéfice pour chaque mesure.`;
  }

  private getSizeRange(size: string): string {
    switch(size) {
      case 'TPE': return '1-10';
      case 'PME': return '10-250';
      case 'ETI': return '250-5000';
      default: return '1-250';
    }
  }
}