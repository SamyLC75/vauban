export type CategorySpec = string | string[];

export interface EnhancedQuestion {
  id: string;
  question: string;
  type: "oui_non" | "texte" | "choix_multiple" | "scale_1_5";
  category?: CategorySpec;           // <- ouvert
  priority: number;                  // 1..10
  source_ids: string[];
  context: { sector: string; unit_type?: string; relevance?: "direct"|"indirect"|"hors_champ" };
}

export interface EnhancedGenerationContext {
  sector: string;
  size: "TPE" | "PME" | "ETI";
  unites: string[];
  historique?: string[];
  contraintes?: string[];
  evidence_sources?: Array<{ id: string; type: "pdf"|"note"|"url"|"data"; content?: string }>;
}

export interface EnhancedQuestionsResponse {
  questions: EnhancedQuestion[];
  metadata: {
    evidence_sources: string[];
    confidence_score: number;     // 0..1
    sector_coverage: number;      // 0..1
    categories_used: string[];
  };
}
