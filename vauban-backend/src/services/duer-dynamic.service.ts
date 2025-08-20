// src/services/duer-dynamic.service.ts
import { AIProvider } from "./ai.provider";
import { getCategoryRegistry } from "./evidence/CategoryRegistry";
import { EnhancedGenerationContext, EnhancedQuestion, EnhancedQuestionsResponse } from "../types/duer-dynamic.types";

export class DuerDynamicService {
  constructor(private ai: AIProvider) {}

  /** Génère un lot "urgent" + une file "complémentaire" en s'appuyant sur CategoryRegistry */
  async generateDynamicQuestions(ctx: EnhancedGenerationContext): Promise<EnhancedQuestionsResponse> {
    const registry = await getCategoryRegistry();

    // 1) Construire un blob d'indices depuis le contexte
    const clues = [
      ctx.sector,
      ctx.unites.join(" "),
      ...(ctx.historique ?? []),
      ...(ctx.contraintes ?? []),
      ...(ctx.evidence_sources?.map(s => s.content ?? "") ?? []),
    ].join(" . ");

    // 2) Détecter catégories pertinentes à partir du YAML
    const cats = registry.match(clues);
    let categories = cats.length ? cats : ["organisationnel"];

    // Si trop peu de catégories détectées, demander à l'IA de classer dans celles du YAML
    if (categories.length < 3) {
      try {
        const all = (await registry.all()).map(c => c.name);
        const cls = await this.ai.chatJSON<{categories: string[]}>(
          `Texte: ${clues}\nCatégories dispo: ${all.join(",")}\nDonne {"categories":["slug","slug2"]} pertinents.`,
          "Tu réponds en JSON strict."
        );
        const extra = (cls?.categories || []).filter(x => all.includes(x));
        categories.splice(0, 0, ...extra.filter(x => !categories.includes(x)));
        // garde 6 max
        while (categories.length > 6) categories.pop();
      } catch (e) {
        console.error("Erreur lors de l'appel à l'IA pour les catégories:", e);
        // On continue avec les catégories déjà détectées
      }
    }

    // 3) Premier lot "urgent" standard + spécifique
    const urgent: EnhancedQuestion[] = [];

    // a) socle obligatoire pour n'importe quel secteur
    urgent.push(
      {
        id: "Q_EXP_EFFECTIFS",
        question: "Combien de salariés sont exposés dans chaque unité de travail ? (nombre par unité)",
        type: "texte",
        category: ["organisationnel"],
        priority: 10, 
        importance: "urgent",
        source_ids: [], 
        context: { sector: ctx.sector },
        gap_reason: "dimensionner exposition et planifier les actions"
      },
      {
        id: "Q_MAITRISE",
        question: "Évaluez la MAÎTRISE actuelle des risques (Aucune/Partielle/Bonne/Très bonne).",
        type: "texte",
        category: ["organisationnel"],
        priority: 9, 
        importance: "urgent",
        source_ids: [], 
        context: { sector: ctx.sector },
        gap_reason: "calcul du risque net et priorisation"
      }
    );

    // b) urgents ciblés par catégories repérées dans le YAML
    const catUrgents: Record<string,string> = {
      bruit: "Avez-vous mesuré les niveaux sonores et équipé les salariés si besoin (EPI) ?",
      ergonomie: "Les postes sont-ils aménagés pour limiter TMS/postures contraignantes ?",
      transport: "Les déplacements pro sont-ils encadrés (véhicules, consignes, formation) ?",
      incendie: "Registre de sécurité incendie à jour et exercices d'évacuation réalisés ?",
      chimique: "Inventaire des produits chimiques à jour (FDS) et stockage conforme ?",
      electrique: "Vérifications périodiques électriques à jour et consignation connue ?",
      psychosocial: "Disposez-vous d'un dispositif de prévention RPS (alerte, soutien, formation) ?",
    };

    categories.forEach((c, i) => {
      const base = catUrgents[c];
      if (base) {
        urgent.push({
          id: `Q_CAT_${c.toUpperCase()}`,
          question: base,
          type: "oui_non",
          category: [c],
          priority: Math.max(8, 9 - i),
          importance: "urgent",
          source_ids: [],
          context: { sector: ctx.sector },
          gap_reason: `informations minimales manquantes pour ${c}`
        });
      }
    });

    // 4) Complémentaires conditionnelles (showIf = oui à l'urgent associé)
    const complementary: EnhancedQuestion[] = [];
    categories.forEach((c) => {
      complementary.push({
        id: `Q_FU_${c.toUpperCase()}_DETAIL`,
        question: `Précisez les situations d'exposition principales pour la catégorie ${c} (où/quand/qui).`,
        type: "texte",
        category: [c],
        priority: 6, 
        importance: "complementaire",
        source_ids: [],
        context: { sector: ctx.sector },
        gap_reason: "meilleur calibrage gravité/probabilité",
        showIf: [{ qid: `Q_CAT_${c.toUpperCase()}`, equals: "oui" } as any]
      });
    });

    // 5) Meta
    const res: EnhancedQuestionsResponse = {
      questions: urgent,
      queue: complementary.length ? { complementary } : undefined,
      remaining_important_estimate: Math.max(0, complementary.length - 3),
      metadata: {
        evidence_sources: (ctx.evidence_sources ?? []).map(s => s.id),
        confidence_score: 0.7,
        sector_coverage: Math.min(1, urgent.length / 6),
        categories_used: categories
      }
    };
    return res;
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
