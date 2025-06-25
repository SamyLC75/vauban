// vauban-backend/src/services/crisis-prompts.service.ts

export interface IncendieContext {
    size: number;
    sector: string;
  }
  
  export class CrisisPromptsService {
    /**
     * Génère le prompt Mistral pour un scénario incendie.
     */
    getIncendiePrompt(ctx: IncendieContext): string {
      const { size, sector } = ctx;
      return `
  Tu es expert en gestion de crise PME.
  Contexte : PME de ${size} personnes, secteur ${sector}
  Situation : Début d'incendie détecté
  
  Génère immédiatement un JSON structuré comportant :
  1. actionsUrgentes (5 max) => liste de chaînes
  2. quiFaitQuoi => tableau d’objets { action, responsable }
  3. pointsRassemblement => liste de chaînes
  4. communications => liste de chaînes
  
  Réponds **uniquement** par ce JSON.
  `;
    }
  }
  