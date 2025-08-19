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

    // 3) Prompt IA pour générer 4–6 questions ciblées (fallback heuristique si l’IA tombe)
    const sys = `Tu es un expert DUER. Réponds uniquement en JSON valide.`;
    const user = JSON.stringify({
      task: "generate_questions",
      sector: ctx.sector,
      size: ctx.size,
      units: ctx.unites,
      categories,
      constraints: ctx.contraintes ?? [],
      history: ctx.historique ?? [],
      rules: [
        "4 à 6 questions maximum",
        "chaque question cible 1..2 catégories détectées",
        "types autorisés: oui_non | texte | choix_multiple | scale_1_5",
        "ajoute source_ids (identifiants courts) quand pertinent"
      ],
      output_shape: {
        questions: [{ id: "Q1", question: "...", type: "oui_non", category: ["..."], source_ids: ["SRC_..."], priority: 1 }]
      }
    });

    let questions: EnhancedQuestion[] = [];
    try {
      const res = await this.ai.chatJSON<{ questions: EnhancedQuestion[] }>(user, sys);
      questions = (res?.questions ?? []).map((q, i) => ({
        id: q.id ?? `Q${i+1}`,
        question: q.question,
        type: (["oui_non","texte","choix_multiple","scale_1_5"].includes(q.type) ? q.type : "texte") as any,
        category: q.category ?? [categories[i % categories.length]],
        priority: Math.min(10, Math.max(1, q.priority ?? 5)),
        source_ids: q.source_ids ?? [],
        context: { sector: ctx.sector }
      }));
    } catch {
      // Fallback : heuristique simple
      questions = categories.slice(0, 4).map((cat, i) => ({
        id: `Q${i+1}`,
        question: this.defaultQuestionFor(cat, ctx),
        type: i % 2 === 0 ? "oui_non" : "texte",
        category: [cat],
        priority: 6 - (i % 3),
        source_ids: [],
        context: { sector: ctx.sector }
      }));
    }

    // 4) Métadonnées
    return {
      questions,
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
