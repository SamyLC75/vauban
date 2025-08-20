// src/services/duer.engine.ts
import { AIProvider } from "./ai.provider";
import { DuerSchema, DuerDoc } from "../schemas/duer.schema";
import { SizeBenchmarks } from "./benchmarks.service";

type QuestionsResponse = {
  questions: Array<{
    id: string;
    question: string;
    type: "oui_non" | "texte" | "choix_multiple" | "scale_1_5";
    justification?: string;
    impact?: string;
  }>;
};

export class DuerEngine {
  constructor(private ai: AIProvider) {}

  buildQuestionsPrompt(sector: string, size: "TPE" | "PME" | "ETI") {
    const bm = SizeBenchmarks[size];
    return `
Tu es un expert DUER certifié CARSAT.
Génère 5 à 8 questions ESSENTIELLES (non redondantes) pour une ${size} (budget repère ${bm.avgBudget}) du secteur ${sector}.
Règles:
- Types autorisés: "oui_non" | "texte" | "choix_multiple" | "scale_1_5"
- Évite les oui/non triviaux si une échelle ou un choix multiple est plus informatif
- Chaque question réduit une incertitude concrète (ex: fréquence, exposition, EPI, procédures)
Format JSON STRICT:
{"questions":[{"id":"Q1","question":"...","type":"oui_non|texte|choix_multiple|scale_1_5","justification":"...","impact":"..."}]}
Réponds UNIQUEMENT par le JSON.`;
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
Tu es expert DUER CERTIFIÉ CARSAT. Retourne un JSON STRICT au format DuerDoc (schéma imposé ci-dessous).

Contexte:
${context}

Règles:
1) Risques SPÉCIFIQUES par unité (pas de copier-coller entre unités). "situation" = qui/quoi/où/quand.
2) Évalue "gravite" et "probabilite" sur 1..4. Calcule "priorite" = gravite × probabilite (nombre).
3) Conformité CARSAT: raisonne avec Probabilité FA/MO/FO et Gravité Mortel/DReversible/DIrreversible pour la hiérarchie ➊➋➌, mais NE SORS QUE des nombres 1..4 + priorite (le serveur traduira les libellés).
4) Plan d'actions STRUCTURÉ: "mesures_proposees" avec type ∈ {collective, individuelle, formation}, delai, cout_estime (€, €€, €€€ ou plage), reference.
5) Mesures RÉALISTES vs budget repère (${bm.avgBudget}), évite le hors-sujet.
6) "synthese" cohérente: compteurs, top_3_priorites, budget_prevention_estime (intervalle).
7) Renseigne pour chaque risque :
   - "maitrise": "AUCUNE"|"PARTIELLE"|"BONNE"|"TRES_BONNE" (selon la qualité des mesures EXISTANTES),
   - "effectifs_concernes": entier approximatif,
   - "penibilite": true/false si facteur de pénibilité s'applique,
   - "applicable": true/false (par défaut true).
   - "suivi.date_decision" et "suivi.realise_le" sont facultatifs.

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
            "maitrise": "AUCUNE|PARTIELLE|BONNE|TRES_BONNE",
            "effectifs_concernes": 3,
            "penibilite": false,
            "applicable": true,
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
              "indicateur": "KPI mesurable",
              "date_decision": "YYYY-MM-DD",
              "realise_le": "YYYY-MM-DD"
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
    const raw = Array.isArray(resp?.questions) ? resp.questions : [];
    // Normalisation et dédoublonnage
    const allowed = new Set(["oui_non","texte","choix_multiple","scale_1_5"]);
    const seen = new Set<string>();
    const out: QuestionsResponse["questions"] = [] as any;
    for (const q of raw) {
      const text = (q?.question || "").trim();
      if (!text) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const type = (q?.type && allowed.has(q.type)) ? q.type : "texte";
      out.push({
        id: `Q${out.length+1}`,
        question: text,
        type: type as any,
        justification: q.justification,
        impact: q.impact,
      });
      if (out.length >= 8) break;
    }
    return out;
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
