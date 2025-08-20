// src/services/duer-dynamic.service.ts
import { AIProvider } from "./ai.provider";
import { getCategoryRegistry } from "./evidence/CategoryRegistry";
import { EnhancedGenerationContext, EnhancedQuestion, EnhancedQuestionsResponse } from "../types/duer-dynamic.types";

export class DuerDynamicService {
  constructor(private ai: AIProvider) {}

  async generateDynamicQuestions(ctx: EnhancedGenerationContext): Promise<EnhancedQuestionsResponse> {
    const registry = await getCategoryRegistry();

    // 1) Construire un "texte" d'évidence basique à partir du contexte + sources
    const blob = [
      ctx.sector,
      ctx.unites.join(' '),
      ...(ctx.historique ?? []),
      ...(ctx.contraintes ?? []),
      ...(ctx.evidence_sources?.map(s => s.content ?? '') ?? [])
    ].join(' . ');

    // 2) Détecter catégories (inclut cyber, climat, etc.)
    const detected = registry.match(blob);
    const categories = detected.length ? detected : ['organisationnel'];

    // 3) Prompt IA – lot prioritaire + file complémentaire (1 seul appel)
    const sys = `Tu es un expert DUER CARSAT. Ne renvoie que du JSON valide strict.`;
    const user = JSON.stringify({
      task: "generate_prioritized_questions",
      sector: ctx.sector,
      size: ctx.size,
      units: ctx.unites,
      categories,
      constraints: ctx.contraintes ?? [],
      history: ctx.historique ?? [],
      rules: [
        "Produis d'abord 3 à 5 QUESTIONS URGENTES (fort impact DUER si non renseignées).",
        "Prépare 3 à 6 QUESTIONS COMPLÉMENTAIRES en file d'attente locale.",
        "Chaque question réduit une incertitude concrète (gap_reason concis).",
        "Types autorisés: oui_non | texte | choix_multiple | scale_1_5.",
        "Ajoute priority 1..10 (10 = plus critique) et importance = urgent|important|complementaire.",
        "Pas de doublons, formulations claires, pas de trivialités."
      ],
      output_shape: {
        urgent: [
          { id: "Q1", question: "...", type: "oui_non", priority: 9, importance: "urgent",
            category: ["..."], source_ids: [], context: { sector: ctx.sector }, gap_reason: "..." }
        ],
        complementary: [
          { id: "QX", question: "...", type: "texte", priority: 6, importance: "complementaire",
            category: ["..."], source_ids: [], context: { sector: ctx.sector }, gap_reason: "..." }
        ],
        remaining_important_estimate: 2
      }
    });

    let questions: EnhancedQuestion[] = [];
    let complementary: EnhancedQuestion[] = [];
    let remainingImportant = 0;
    
    try {
      const res = await this.ai.chatJSON<{ urgent?: EnhancedQuestion[]; complementary?: EnhancedQuestion[]; remaining_important_estimate?: number }>(user, sys);
      const urgent = Array.isArray(res?.urgent) ? res!.urgent : [];
      complementary = Array.isArray(res?.complementary) ? res!.complementary : [];
      remainingImportant = Number(res?.remaining_important_estimate || 0);

      questions = urgent.map((q, i) => ({
        id: q.id ?? `Q${i+1}`,
        question: q.question,
        type: (["oui_non","texte","choix_multiple","scale_1_5"].includes(q.type) ? q.type : "texte") as any,
        category: q.category ?? [categories[i % categories.length]],
        priority: Math.min(10, Math.max(1, (q as any).priority ?? 5)),
        importance: (q as any).importance === "urgent" ? "urgent" : ((q as any).importance || "important"),
        source_ids: q.source_ids ?? [],
        context: { sector: ctx.sector },
        gap_reason: (q as any).gap_reason
      }));
    } catch {
      // Fallback : heuristique simple
      questions = categories.slice(0, 4).map((cat, i) => ({
        id: `Q${i+1}`,
        question: this.defaultQuestionFor(cat, ctx),
        type: i % 2 === 0 ? "oui_non" : "texte",
        category: [cat],
        priority: 6 - (i % 3),
        importance: i < 2 ? "urgent" : "complementaire",
        source_ids: [],
        context: { sector: ctx.sector }
      }));
      complementary = [];
      remainingImportant = Math.max(0, questions.filter(q => q.importance === "complementaire").length - 2);
    }

    // 4) Métadonnées
    return {
      questions, // urgentes/essentielles
      queue: complementary.length > 0 ? { complementary } : undefined,
      remaining_important_estimate: remainingImportant,
      metadata: {
        evidence_sources: (ctx.evidence_sources ?? []).map(s => s.id),
        confidence_score: questions.length ? 0.7 : 0.0,
        sector_coverage: Math.min(1, questions.length / 6),
        categories_used: Array.from(new Set(
          questions.flatMap(q => Array.isArray(q.category) ? q.category : (q.category ? [q.category] : []))
        ))
      }
    };
  }

  private defaultQuestionFor(cat: string, ctx: EnhancedGenerationContext): string {
    switch (cat) {
      case 'cybersecurite':
        return "Avez-vous une politique de mots de passe et une MFA active pour les accès critiques ?";
      case 'climat':
        return "Disposez-vous d’un plan canicule/inondation impactant vos unités de travail ?";
      case 'bruit':
        return "Avez-vous mesuré les niveaux sonores et fourni des protections auditives si nécessaire ?";
      case 'ergonomie':
        return "Les postes sont-ils aménagés pour limiter les postures contraignantes et TMS ?";
      case 'transport':
        return "Les déplacements professionnels sont-ils encadrés (véhicules, consignes, formation conduite) ?";
      default:
        return `Quel est l'état des mesures de prévention concernant la catégorie "${cat}" dans vos unités ?`;
    }
  }
}
