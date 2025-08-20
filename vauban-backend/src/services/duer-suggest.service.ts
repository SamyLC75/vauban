import { AIProvider } from "./ai.provider";
import { getCategoryRegistry } from "./evidence/CategoryRegistry";

export type RiskSuggestion = {
  unit: string;
  danger: string;
  situation: string;
  gravite: number; 
  probabilite: number; 
  priorite: number;
  mesures_proposees: { 
    type?: "collective"|"individuelle"|"formation"; 
    description: string; 
    reference?: string 
  }[];
  confidence: number; // 0..1
  why: string;
};

export class DuerSuggestService {
  constructor(private ai: AIProvider) {}

  private buildPrompt(params: {
    sector: string; 
    units: string[]; 
    categories: string[];
    historique?: string[]; 
    contraintes?: string[]; 
    reponses?: Record<string,string>;
  }) {
    const ctx = {
      sector: params.sector,
      units: params.units,
      categories: params.categories,
      hints: {
        historique: params.historique || [],
        contraintes: params.contraintes || [],
        reponses: params.reponses || {}
      }
    };
    return `
Tu es expert DUER CARSAT. Propose 3 à 6 RISQUES plausibles oubliés pour ce contexte.
- Pour chaque risque: propose une unité la plus probable, un danger, une SITUATION (où/quand/qui), gravité 1..4, probabilité 1..4,
  des mesures_proposees (type ∈ {collective, individuelle, formation}, description concrète, référence réglementaire/INRS si pertinent),
  une confidence 0..1 et un "why" (2 phrases max).
- Les catégories suivantes sont pertinentes (issues d'un YAML interne): ${params.categories.join(", ")}.
- Unités disponibles: ${params.units.join(", ")}.
- Contexte: ${JSON.stringify(ctx.hints)}.

Réponds UNIQUEMENT en JSON strict:
{"suggestions":[
  {"unit":"...","danger":"...","situation":"...","gravite":2,"probabilite":2,"priorite":4,
   "mesures_proposees":[{"type":"collective","description":"...","reference":"..."}],
   "confidence":0.72,"why":"..."}
]}`;
  }

  async suggest(input: {
    sector: string; 
    units: string[];
    historique?: string[]; 
    contraintes?: string[]; 
    reponses?: Record<string,string>;
  }): Promise<RiskSuggestion[]> {
    const reg = await getCategoryRegistry();
    const clues = [
      input.sector, 
      input.units.join(" "), 
      ...(input.historique||[]), 
      ...(input.contraintes||[]), 
      JSON.stringify(input.reponses||{})
    ].join(" . ");
    
    const categories = reg.match(clues);
    const prompt = this.buildPrompt({ 
      ...input, 
      categories: categories.length ? categories : ["organisationnel"] 
    });

    const out = await this.ai.chatJSON<{ suggestions: RiskSuggestion[] }>(
      prompt, 
      "Tu réponds en JSON strict."
    );
    
    const list = Array.isArray(out?.suggestions) ? out!.suggestions : [];
    // Sanity + déduplication simple
    const seen = new Set<string>();
    const clean = list
      .filter(s => s?.danger && s?.situation && s?.unit)
      .map(s => ({ 
        ...s, 
        priorite: Number(s.priorite ?? (s.gravite||1)*(s.probabilite||1)) 
      }))
      .filter(s => {
        const key = `${s.unit}::${s.danger}::${s.situation}`.toLowerCase();
        if (seen.has(key)) return false; 
        seen.add(key); 
        return true;
      })
      .slice(0, 6);
      
    return clean;
  }
}
