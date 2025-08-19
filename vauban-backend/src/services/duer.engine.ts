// src/services/duer.engine.ts
import { AIProvider } from "./ai.provider";
import { DuerSchema, DuerDoc } from "../schemas/duer.schema";
import { SizeBenchmarks } from "./benchmarks.service";

type QuestionsResponse = {
  questions: Array<{
    id: string;
    question: string;
    type: "oui_non" | "texte";
    justification?: string;
    impact?: string;
  }>;
};

export class DuerEngine {
  constructor(private ai: AIProvider) {}

  buildQuestionsPrompt(sector: string, size: "TPE" | "PME" | "ETI") {
    const bm = SizeBenchmarks[size];
    return `
En tant qu'expert DUER, génère 4-6 questions ESSENTIELLES pour une ${size} (budget repère ${bm.avgBudget}) du secteur ${sector}.
Format JSON STRICT:
{"questions":[{"id":"Q1","question":"...","type":"oui_non|texte","justification":"...","impact":"..."}]}
UNIQUEMENT le JSON.`;
  }

  buildGeneratePrompt(params: {
    sector: string;
    size: "TPE" | "PME" | "ETI";
    unites: string[];
    historique?: string;
    contraintes?: string;
    reponses?: Record<string, any>;
  }) {
    const bm = SizeBenchmarks[params.size];
    const context = `
- Secteur: ${params.sector}
- Taille: ${params.size} (budget repère ${bm.avgBudget})
- Unités: ${params.unites.join(", ")}
${params.historique ? "- Historique: " + params.historique : ""}
${params.contraintes ? "- Contraintes: " + params.contraintes : ""}
${params.reponses ? "- Réponses: " + JSON.stringify(params.reponses) : ""}

Pondération scoring: priorite = round(gravite*${bm.weightGrav} * probabilite*${bm.weightProb})
Top risques taille ${params.size}: ${bm.topRisks.join(", ")}.`.trim();

    return `
Tu es expert DUER. Retourne un JSON strict au format DuerDoc.

Contexte:
${context}

Règles:
1) Risques spécifiques par unité (pas de doublons génériques).
2) Donne gravité et probabilité 1..4, calcule "priorite".
3) Mesures réalistes selon budget repère (${bm.avgBudget}), classées (collective, individuelle, formation).
4) Références: cite Code du travail/INRS pertinentes si connues.
5) "synthese" doit contenir les compteurs et "budget_prevention_estime".

FORMAT DE SORTIE (JSON STRICT) — UNIQUEMENT le JSON, pas de texte autour:
{
  "duer": {
    "secteur": "${params.sector}",
    "date_generation": "YYYY-MM-DD",
    "unites": [
      {
        "nom": "Nom de l'unité",
        "risques": [
          {
            "id": "R001",
            "danger": "Description précise",
            "situation": "Contexte d'exposition",
            "gravite": 1,
            "probabilite": 1,
            "priorite": 1,
            "mesures_existantes": ["..."],
            "mesures_proposees": [
              {
                "type": "collective|individuelle|formation",
                "description": "Mesure concrète et réaliste",
                "delai": "immédiat|court_terme|moyen_terme",
                "cout_estime": "€|€€|€€€",
                "reference": "Article du Code du travail ou INRS"
              }
            ],
            "suivi": {
              "responsable": "fonction",
              "echeance": "3 mois|6 mois|1 an",
              "indicateur": "KPI mesurable"
            }
          }
        ]
      }
    ],
    "synthese": {
      "nb_risques_critiques": 0,
      "nb_risques_importants": 0,
      "nb_risques_moderes": 0,
      "top_3_priorites": ["...", "...", "..."],
      "budget_prevention_estime": "X-Y€",
      "conformite_reglementaire": {
        "points_forts": ["..."],
        "points_vigilance": ["..."]
      }
    }
  }
}`;
  }

  async generateQuestions(sector: string, size: "TPE" | "PME" | "ETI") {
    const prompt = this.buildQuestionsPrompt(sector, size);
    const resp = await this.ai.chatJSON<QuestionsResponse>(prompt, 'Tu réponds en JSON strict.');
    return Array.isArray(resp?.questions) ? resp.questions : [];
  }

  async generateDUER(input: {
    sector: string;
    size: "TPE" | "PME" | "ETI";
    unites: string[];
    historique?: string;
    contraintes?: string;
    reponses?: Record<string, any>;
  }): Promise<DuerDoc> {
    const prompt = this.buildGeneratePrompt(input);
    const out = await this.ai.chatJSON<unknown>(prompt, 'Tu réponds en JSON strict.');
    const raw = (out as any)?.duer ?? out;
    const parsed = DuerSchema.parse(raw);
    return parsed;
  }
}
