// src/services/slot-filling.service.ts
import { AIProvider } from "./ai.provider";
import { DuerDynamicService } from "./duer-dynamic.service";

export type SlotNextInput = {
  sector: string;
  size: "TPE" | "PME" | "ETI";
  unites: string[];
  historique?: string[];
  contraintes?: string[];
  evidence_sources?: Array<{ id: string; content: string }>;
  asked?: { id: string; question: string }[];
  answers?: Record<string, string>;
  coverageTarget?: number; // 0..1
  maxNew?: number;         // default 6
};

export type SlotNextResponse = {
  questions: Array<{
    id: string;
    question: string;
    type: "oui_non" | "texte";
    showIf?: { qid: string; equals: string }[];
    category?: string[];
    importance?: "urgent" | "important" | "complementaire";
    priority?: number;
  }>;
  coverage: number;          // 0..1
  missing_reasons: string[];
  stop: boolean;
  meta: {
    detected_categories: string[];
    remaining_important_estimate?: number;
  };
};

export class SlotFillingService {
  constructor(private ai: AIProvider) {}

  async next(input: SlotNextInput): Promise<SlotNextResponse> {
    const dyn = new DuerDynamicService(this.ai);

    // Adapter les evidence_sources au format attendu par DuerDynamicService
    const evMapped = (input.evidence_sources || []).map(s => ({
      id: s.id,
      type: "data" as const,
      content: s.content
    }));

    // 1) base de questions (urgentes + complémentaires)
    const base = await dyn.generateDynamicQuestions({
      sector: input.sector,
      size: input.size,
      unites: input.unites,
      historique: input.historique || [],
      contraintes: input.contraintes || [],
      evidence_sources: evMapped
    });

    const askedIds = new Set((input.asked || []).map(q => q.id));
    const answers = input.answers || {};
    const coverageTarget = Math.min(1, Math.max(0.5, input.coverageTarget ?? 0.8));
    const maxNew = Math.max(3, Math.min(12, input.maxNew ?? 6));

    // 2) couverture : effectifs + maîtrise + une urgente par catégorie
    const categories = (base as any).metadata?.categories_used || [];
    const urgentByCat = new Set(
      (base.questions || [])
        .filter((q: any) => q.importance === "urgent" && Array.isArray(q.category) && q.category.length)
        .map((q: any) => (q.category as string[])[0])
    );

    let covered = 0;
    let totalSlots = 2 + urgentByCat.size; // effectifs + maîtrise + par catégorie
    if (answers["Q_EXP_EFFECTIFS"] && String(answers["Q_EXP_EFFECTIFS"]).trim()) covered += 1;
    if (answers["Q_MAITRISE"] && String(answers["Q_MAITRISE"]).trim()) covered += 1;
    urgentByCat.forEach(c => {
      const qid = `Q_CAT_${String(c || "").toUpperCase()}`;
      if (answers[qid]) covered += 1;
    });
    let coverage = totalSlots ? covered / totalSlots : 0;

    // 3) calcul "want"
    const want = (q: any) => {
      if (askedIds.has(q.id)) return false;
      const conds = (q.showIf || []) as Array<{ qid: string; equals: string }>;
      return conds.every(c => answers[c.qid] === c.equals);
    };

    const next: SlotNextResponse["questions"] = [];
    const missing: string[] = [];

    // urgentes d'abord
    (base.questions || [])
      .filter((q: any) => q.importance === "urgent")
      .filter(want)
      .slice(0, maxNew)
      .forEach((q: any) =>
        next.push({
          id: q.id,
          question: q.question,
          type: q.type === "oui_non" ? "oui_non" : "texte",
          showIf: q.showIf as any,
          category: q.category,
          importance: "urgent",
          priority: q.priority
        })
      );

    // compléter avec complémentaires si besoin
    const comp = (base as any).queue?.complementary || [];
    if (next.length < maxNew && comp.length) {
      comp.filter(want)
        .slice(0, maxNew - next.length)
        .forEach((q: any) =>
          next.push({
            id: q.id,
            question: q.question,
            type: q.type === "oui_non" ? "oui_non" : "texte",
            showIf: q.showIf as any,
            category: q.category,
            importance: "complementaire",
            priority: q.priority
          })
        );
    }

    // 4) si encore insuffisant, demander une salve "clarifications"
    if (coverage < coverageTarget && next.length === 0) {
      const clarif = await this.ai.chatJSON<{ questions: any[] }>(
        [
          `Contexte: ${JSON.stringify({
            sector: input.sector, size: input.size, units: input.unites,
            evidence: { historique: input.historique||[], contraintes: input.contraintes||[] }
          })}`,
          `Réponses actuelles: ${JSON.stringify(answers)}`,
          `Objectif: poser des PRÉCISIONS ciblées (3–6) sur l'exposition (où/quand/qui), EPI/procédures et contrôles/maintenances.`,
          `Format JSON strict: {"questions":[{"id":"QX","question":"...","type":"oui_non|texte","showIf":[{"qid":"...","equals":"..."}]}]}`
        ].join("\n"),
        "Tu es un expert DUER. Réponds UNIQUEMENT en JSON conforme."
      );
      const incoming = Array.isArray(clarif?.questions) ? clarif.questions : [];
      for (const q of incoming.slice(0, maxNew)) {
        if (askedIds.has(q.id)) continue;
        next.push({
          id: String(q.id || `QX_${Math.random().toString(36).slice(2,7)}`),
          question: String(q.question || "").trim(),
          type: q.type === "oui_non" ? "oui_non" : "texte",
          showIf: Array.isArray(q.showIf) ? q.showIf : undefined,
          importance: "complementaire"
        });
      }
    }

    const willCover = next.some(q => q.id === "Q_EXP_EFFECTIFS") || next.some(q => q.id === "Q_MAITRISE");
    if (willCover) {
      const missingSlots: string[] = [];
      if (!answers["Q_EXP_EFFECTIFS"]) missingSlots.push("effectifs par unité");
      if (!answers["Q_MAITRISE"]) missingSlots.push("niveau de maîtrise");
      missing.push(...missingSlots);
    }
    if (urgentByCat.size) {
      const needCats: string[] = [];
      urgentByCat.forEach(c => {
        const qid = `Q_CAT_${String(c || "").toUpperCase()}`;
        if (!answers[qid]) needCats.push(String(c));
      });
      if (needCats.length) missing.push(`confirmation initiale par catégorie: ${needCats.slice(0,4).join(", ")}`);
    }

    const stop = coverage >= coverageTarget || (next.length === 0 && coverage >= 0.6);

    return {
      questions: next,
      coverage: Math.min(1, coverage),
      missing_reasons: missing,
      stop,
      meta: {
        detected_categories: categories,
        remaining_important_estimate: (base as any).remaining_important_estimate ?? 0
      }
    };
  }
}
