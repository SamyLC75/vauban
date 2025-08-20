import { DuerDoc } from "../schemas/duer.schema";
import { normalizeDuerDoc } from "./duer-normalize.service";
import { getCategoryRegistry } from "./evidence/CategoryRegistry";
import { MistralProvider } from "./mistral.provider";
import { AuditReport, TAuditReport, TAuditIssue } from "../schemas/duer-audit.schema";

const SMART_HINTS = [
  "formuler l'action avec un verbe d'action précis",
  "assigner un responsable",
  "définir une échéance (date ou horizon)",
  "ajouter un indicateur mesurable (KPI)",
];

const HIGH_RISK_NET = 12;   // critique
const MID_RISK_NET  = 8;    // important

export class DuerAuditService {
  constructor(private ai = new MistralProvider()) {}

  /** Audit global : coverage catégories + règles qualité + suggestions IA SMART lorsqu'utile */
  async audit(doc: DuerDoc, ctx?: { sector?: string; unites?: string[] }): Promise<TAuditReport> {
    const normalized = normalizeDuerDoc(doc);
    const issues: TAuditIssue[] = [];

    // 1) Coverage (catégories détectées vs couvertes dans les risques)
    const reg = await getCategoryRegistry();
    const clues = [
      ctx?.sector || normalized.secteur,
      ...(ctx?.unites || normalized.unites.map(u => u.nom)),
      ...normalized.unites.flatMap(u => u.risques.map(r => `${r.danger} ${r.situation}`))
    ].join(" . ");

    const detected = reg.match(clues);
    const risksText = normalized.unites.flatMap(u => u.risques.map(r => `${r.danger} ${r.situation}`)).join(" . ");
    const covered = reg.match(risksText);
    const covSet = new Set(covered);
    const missing = detected.filter(c => !covSet.has(c));
    const coverage_ratio = detected.length ? covered.length / detected.length : 1;

    // 2) Règles déterministes
    normalized.unites.forEach((u) => {
      u.risques.forEach((r, idx) => {
        const pathBase = [`unit:${u.nom}`, `risk:${r.id || idx}`];

        // 2.1 Champ pénibilité renseigné
        if (r.penibilite === undefined || r.penibilite === null) {
          issues.push({
            code: "PENIBILITE_UNSET",
            severity: "minor",
            message: `Pénibilité non renseignée pour le risque "${r.danger}".`,
            path: pathBase,
            suggestion: "Qualifier la pénibilité (Oui/Non) lorsque pertinent."
          });
        }

        // 2.2 Risque important/critique sans mesures proposées
        const riskNet = Number(r.risque_net ?? r.priorite ?? (r.gravite * r.probabilite));
        if (riskNet >= MID_RISK_NET && (!r.mesures_proposees || r.mesures_proposees.length === 0)) {
          issues.push({
            code: "HIGH_RISK_NO_MEASURES",
            severity: riskNet >= HIGH_RISK_NET ? "critical" : "major",
            message: `Risque ${riskNet >= HIGH_RISK_NET ? "critique" : "important"} sans mesure proposée : "${r.danger}".`,
            path: pathBase,
            suggestion: "Ajouter au moins une mesure de prévention (collective/EPI/formation) avec responsable et échéance."
          });
        }

        // 2.3 Qualité SMART des mesures existantes
        (r.mesures_proposees || []).forEach((m, midx) => {
          const mpath = [...pathBase, `measure:${midx}`];
          const desc = (m?.description || "").trim();

          // Référence recommandée
          if (!m?.reference) {
            issues.push({
              code: "MISSING_REFERENCE",
              severity: "minor",
              message: `Référence réglementaire/INRS absente pour une mesure.`,
              path: mpath,
              suggestion: "Ajouter l'article du Code du travail ou une note INRS/CARSAT pertinente."
            });
          }

          // Type recommandé
          if (!m?.type) {
            issues.push({
              code: "MISSING_TYPE",
              severity: "minor",
              message: `Type de mesure non renseigné (collective/individuelle/formation).`,
              path: mpath,
              suggestion: "Renseigner le type (collective, individuelle, formation)."
            });
          }

          // Délai recommandé
          if (!m?.delai) {
            issues.push({
              code: "MISSING_DELAI",
              severity: "minor",
              message: `Délai non renseigné pour une mesure.`,
              path: mpath,
              suggestion: "Préciser le délai (immédiat, court_terme, moyen_terme, long_terme)."
            });
          }

          // SMART heuristique basique
          const hasVerb = /^\s*(mettre|installer|former|remplacer|vérifier|réviser|nettoyer|baliser|mesurer|auditer|afficher)\b/i.test(desc);
          const hasResp = !!r?.suivi?.responsable;
          const hasEch  = !!r?.suivi?.echeance;
          const hasKPI  = !!r?.suivi?.indicateur;

          if (!(hasVerb && hasResp && hasEch && hasKPI)) {
            issues.push({
              code: "MEASURE_NOT_SMART",
              severity: "major",
              message: `Mesure insuffisamment SMART : "${desc || "(vide)"}".`,
              path: mpath,
              suggestion: `Améliorer selon SMART : ${SMART_HINTS.join(", ")}.`
            });
          }
        });
      });
    });

    // 3) IA — réécriture SMART courte des mesures "faibles"
    const weak = issues
      .filter(i => i.code === "MEASURE_NOT_SMART")
      .slice(0, 12); // borne coût

    if (weak.length) {
      try {
        const payload = {
          measures: weak.map(w => ({ path: w.path.join(" > "), suggestion: w.suggestion })),
          context: {
            sector: ctx?.sector || normalized.secteur,
            examples: normalized.unites.slice(0,2).flatMap(u => u.risques.slice(0,2).map(r => ({
              danger: r.danger, situation: r.situation
            })))
          }
        };
        const prompt = `Tu es expert DUER CARSAT. Réécris chaque mesure non SMART en une phrase SMART (verbe d'action, responsable générique, délai, KPI). Réponds JSON strict:
{"rewrites":[{"path":"unit:... > risk:... > measure:0","smart":"... (type: collective|individuelle|formation; delai: ...; kpi: ...; ref: ...)"}]}`;
        const out = await this.ai.chatJSON<{ rewrites?: Array<{ path: string; smart: string }>}>(
          JSON.stringify(payload), prompt
        );
        const map = new Map<string,string>();
        (out?.rewrites || []).forEach(r => map.set((r.path||"").trim(), r.smart));

        weak.forEach(w => {
          const key = w.path.join(" > ");
          const smart = map.get(key);
          if (smart) w.suggestion = `Exemple SMART : ${smart}`;
        });
      } catch (e) {
        // non bloquant
      }
    }

    // 4) Résumé
    const counts: Record<string, number> = { critical: 0, major: 0, minor: 0, info: 0 };
    issues.forEach(i => { counts[i.severity] = (counts[i.severity] || 0) + 1; });
    const score = Math.max(0, 100
      - counts.critical * 25
      - counts.major * 10
      - counts.minor * 3
    );

    const report = {
      summary: { issue_counts: counts, score },
      coverage: {
        detected_categories: detected,
        covered_categories: Array.from(covSet),
        missing_categories: missing,
        coverage_ratio
      },
      issues
    };

    return AuditReport.parse(report);
  }
}
