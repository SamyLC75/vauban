import { DuerDoc } from "../schemas/duer.schema";

/** Only keep the 3 measure types allowed by the schema */
type AllowedMeasureType = "collective" | "individuelle" | "formation";

/** Keep your rich helper enum for authoring/input */
type MesureType =
  | "collective"
  | "individuelle"
  | "formation"
  | "organisationnelle"
  | "technique";

// Helpers
const clamp1to4 = (n: any) => Math.min(4, Math.max(1, Number(n ?? 1)));

const toAllowedMeasureType = (t?: string): AllowedMeasureType | undefined => {
  const s = (t || "").toLowerCase().trim();
  if (["collective", "collectif", "collectives"].includes(s)) return "collective";
  if (["individuelle", "individuel", "epi", "épi", "equipement individuel"].includes(s)) return "individuelle";
  if (["formation", "training", "sensibilisation"].includes(s)) return "formation";
  return undefined;
};

const ensureRiskId = () =>
  `R${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** ───── Types (split incoming vs normalized) ───── */

type Maitrise = "AUCUNE" | "PARTIELLE" | "BONNE" | "TRES_BONNE";

/** What callers can give to pushRisk: lenient/optional fields allowed */
interface IncomingRisk {
  danger: string;
  situation: string;
  gravite: number;
  probabilite: number;
  priorite?: number;                // optional coming in
  applicable?: boolean;
  mesures_existantes?: string[];
  mesures_proposees?: Array<{
    type?: MesureType | string;     // we’ll map to AllowedMeasureType
    description: string;
    delai?: string;
    cout_estime?: string;
    reference?: string;
  }>;
  suivi?: {
    // callers may send richer fields; we will trim to schema
    responsable?: string;
    echeance?: string;
    indicateur?: string;
    date_decision?: string; // ignored by schema below
    realise_le?: string;    // ignored by schema below
  };
  maitrise?: Maitrise;
  effectifs_concernes?: number | null;
  penibilite?: boolean | null;
  [key: string]: any;
}

/** What the schema expects inside DuerDoc: strict/required */
interface NormalizedRisk {
  id: string;
  danger: string;
  situation: string;
  gravite: number;
  probabilite: number;
  priorite: number;                 // ✅ required now
  mesures_existantes: string[];     // ✅ required arrays
  mesures_proposees: Array<{
    description: string;
    type?: AllowedMeasureType;
    delai?: string;
    cout_estime?: string;
    reference?: string;
  }>;
  suivi?: {
    responsable?: string;
    echeance?: string;
    indicateur?: string;
  };
  // optional extra fields that your UI/services use at runtime
  applicable?: boolean;
  maitrise?: Maitrise;
  effectifs_concernes?: number | null;
  penibilite?: boolean | null;
  // allow future properties without breaking
  [key: string]: any;
}

/** 1) Ajout de risques organisationnels en fonction des réponses */
export function enhanceWithOrgRisks(
  answers: Record<string, any>,
  doc: DuerDoc,
  opts?: { budgetSerre?: boolean }
): DuerDoc {
  // 1) CACES manquants / expirés
  const cacesYes = Object.values(answers).some((v) =>
    String(v).toLowerCase().includes("caces") && /manquant|expir|non/i.test(String(v))
  );
  if (cacesYes) {
    pushRisk(doc, {
      danger: "Absence / expiration d'autorisations CACES",
      situation: "Conduite d'engins ou chariots sans autorisation valide",
      gravite: 3,
      probabilite: 3,
      mesures_existantes: [],
      mesures_proposees: [
        {
          type: "organisationnelle",
          description: "Planifier recyclage CACES (liste nominative + échéances)",
          delai: "≤ 30 jours",
          cout_estime: "≈ 300€ / pers.",
        },
        { type: "formation", description: "Former les nouveaux entrants avant prise de poste", delai: "continu" },
        { type: "organisationnelle", description: "Registre de suivi CACES avec alertes d'expiration", delai: "immédiat" },
      ],
      suivi: { responsable: "Responsable RH / Exploitation", echeance: "3 mois", indicateur: "% salariés CACES valides" },
    });
  }

  // 2) Procédures d'urgence
  pushRisk(doc, {
    danger: "Procédures d'urgence incomplètes",
    situation: "Absence de protocole en cas d'intoxication, incendie ou évacuation",
    gravite: 4,
    probabilite: 2,
    mesures_proposees: [
      { type: "organisationnelle", description: "Établir et afficher procédure d'évacuation + point de rassemblement", delai: "immédiat" },
      { type: "formation", description: "Exercice d'évacuation et trousse de secours contrôlée", delai: "≤ 60 jours" },
      { type: "organisationnelle", description: "Désigner des équipiers SST / évacuation", delai: "≤ 30 jours" },
    ],
    suivi: { responsable: "HSE / Établissement", echeance: "1 mois", indicateur: "1 exercice/semestre ; taux de participation" },
  });

  // 3) Ventilation → maintenance
  const hasVentil = doc.unites.some((u) =>
    u.risques.some((r) => r.mesures_proposees?.some((m: any) => /ventilation/i.test(m.description)))
  );
  if (hasVentil) {
    pushRisk(doc, {
      danger: "Maintenance préventive ventilation non planifiée",
      situation: "Arrêt d'activité ou exposition accrue si panne",
      gravite: 3,
      probabilite: 2,
      mesures_proposees: [
        { type: "organisationnelle", description: "Contrat de maintenance + contrôles trimestriels", delai: "≤ 90 jours", cout_estime: "≈ 300–600€/an" },
        { type: "technique", description: "Capteurs simple flux / dépression avec alerte", delai: "≤ 120 jours" },
      ],
      suivi: { responsable: "Maintenance / Technique", echeance: "1 mois", indicateur: "Taux de disponibilité ventilation (%)" },
    });
  }

  // 4) Phasage budget
  tagBudgetPhasing(doc, !!opts?.budgetSerre);

  return doc;
}

/** Normalize and push a risk to a unit (guarantees priorite: number) */
function pushRisk(doc: DuerDoc, risk: IncomingRisk, unitName = "Organisation") {
  let unit = doc.unites.find((u) => u.nom.toLowerCase() === unitName.toLowerCase());
  if (!unit) {
    unit = { nom: unitName, risques: [] };
    doc.unites.push(unit);
  }

  const g = clamp1to4(risk.gravite);
  const p = clamp1to4(risk.probabilite);

  const normalized: NormalizedRisk = {
    id: (risk as any).id || ensureRiskId(),
    danger: risk.danger,
    situation: risk.situation,
    gravite: g,
    probabilite: p,
    priorite: risk.priorite ?? g * p, // ✅ now guaranteed number
    mesures_existantes: Array.isArray(risk.mesures_existantes) ? risk.mesures_existantes : [],
    mesures_proposees: (Array.isArray(risk.mesures_proposees) ? risk.mesures_proposees : []).map((m) => ({
      description: String(m?.description || "").trim(),
      type: toAllowedMeasureType(m?.type as string), // ✅ narrowed to schema
      delai: m?.delai,
      cout_estime: m?.cout_estime,
      reference: m?.reference,
    })),
    // trim to schema for suivi (no date_decision/realise_le unless you extend the schema)
    ...(risk.suivi
      ? {
          suivi: {
            responsable: risk.suivi.responsable,
            echeance: risk.suivi.echeance,
            indicateur: risk.suivi.indicateur,
          },
        }
      : {}),
    applicable: risk.applicable !== false,
    maitrise: risk.maitrise,
    effectifs_concernes: risk.effectifs_concernes ?? null,
    penibilite: risk.penibilite ?? null,
  };

  unit.risques.push(normalized as any); // if your DuerDoc risk type matches, you can drop “as any”
}

/** Phase low-cost / later-cost measures (kept as before) */
function tagBudgetPhasing(doc: DuerDoc, budgetSerre: boolean) {
  for (const u of doc.unites) {
    for (const r of u.risques as any[]) {
      if (!r.mesures_proposees?.length) continue;
      const phased: typeof r.mesures_proposees = [];
      for (const m of r.mesures_proposees) {
        phased.push({
          ...m,
          description: `PHASE 1 — ${m.description}`,
          delai: m.delai || "≤ 30 jours",
          cout_estime: m.cout_estime || (budgetSerre ? "0–500€" : "—"),
        });
        if (/ventilation|capotage|isolation|collective|localisé/i.test(m.description)) {
          phased.push({
            ...m,
            description: `PHASE 2 — ${m.description}`,
            delai: "≤ 6–12 mois",
            cout_estime: m.cout_estime || "2 000–8 000€",
          });
        }
      }
      if (phased.length > 0) r.mesures_proposees = phased;
    }
  }
}

/** keep your other exports unchanged */
export function filterRisksInScope(doc: DuerDoc, opts?: { mode?: "keep_all" | "only_applicable" }): DuerDoc { /* ... */ return doc; }
export function applyAnswersToDoc(answers: Record<string, any>, doc: DuerDoc): DuerDoc { /* ... */ return doc; }
export function recomputePriorities(doc: DuerDoc, weightProb: number = 1, weightGrav: number = 1): DuerDoc { /* ... */ return doc; }
export function smartifyMeasures(doc: DuerDoc): DuerDoc { /* ... */ return doc; }
