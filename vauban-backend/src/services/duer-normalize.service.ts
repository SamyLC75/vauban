import { DuerDoc, DuerSchema } from "../schemas/duer.schema";

// --- Types locaux (pas de dépendance à MaitriseEnum dans le schéma) ---
type Maitrise = "AUCUNE" | "PARTIELLE" | "BONNE" | "TRES_BONNE";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type DuerCandidate = DeepPartial<DuerDoc>;

// Define the exact shape of a proposed measure
interface IProposedMeasure {
  type: string;
  description: string;
  delai?: string;
  cout_estime?: string;
  reference?: string;
}

/** Mapping maîtrise -> coefficient atténuation */
const MAITRISE_FACTEUR: Record<Maitrise, number> = {
  AUCUNE: 0,
  PARTIELLE: 0.5,
  BONNE: 0.7,
  TRES_BONNE: 0.9,
} as const;

/** Niveau de criticité sur le NET (r_net) */
function criticiteFromNet(net: number) {
  if (net >= 12) return "critique";
  if (net >= 8)  return "important";
  if (net >= 4)  return "modere";
  return "faible";
}

/** Calcule risque net (arrondi supérieur) */
function computeRisqueNet(g: number, p: number, maitrise?: Maitrise) {
  const f = maitrise ? MAITRISE_FACTEUR[maitrise] ?? 0 : 0;
  return Math.ceil((Number(g)||1) * (Number(p)||1) * (1 - f));
}

// Type guard to check if an object is a valid proposed measure
function isProposedMeasure(obj: any): obj is IProposedMeasure {
  return (
    obj &&
    typeof obj === 'object' &&
    'type' in obj &&
    'description' in obj &&
    !!obj.type &&
    !!obj.description
  );
}

// Helper to safely convert a value to a string with a max length
function safeString(value: unknown, maxLength: number = 1000): string {
  return String(value || '').slice(0, maxLength);
}

export function normalizeDuerDoc(doc: DuerDoc): DuerDoc {
  let nbCrit = 0, nbImp = 0, nbMod = 0;
  const next = { ...doc, unites: [...doc.unites] };

  for (const u of next.unites) {
    (u as any).id = (u as any).id || `U-${u.nom}-${Math.random().toString(36).slice(2,6)}`;
    for (const r of u.risques as any[]) {
      // champs facultatifs non présents dans le type de schéma => cast
      if ((r as any).applicable === undefined) (r as any).applicable = true;

      // priorité brute
      (r as any).priorite = Number((r as any).priorite || ((r as any).gravite * (r as any).probabilite));

      // risque net selon maitrise éventuelle
      const m = (r as any).maitrise as Maitrise | undefined;
      (r as any).risque_net = computeRisqueNet((r as any).gravite, (r as any).probabilite, m);

      const level = criticiteFromNet((r as any).risque_net);
      if (level === "critique") nbCrit++;
      else if (level === "important") nbImp++;
      else if (level === "modere") nbMod++;
    }
  }

  // Initialize synths if not present
  (next as any).synthese = (next as any).synthese || {
    nb_risques_critiques: 0,
    nb_risques_importants: 0,
    nb_risques_moderes: 0,
    top_3_priorites: [],
    budget_prevention_estime: "—",
    conformite_reglementaire: {
      points_forts: [],
      points_vigilance: []
    }
  };

  (next as any).synthese.nb_risques_critiques = nbCrit;
  (next as any).synthese.nb_risques_importants = nbImp;
  (next as any).synthese.nb_risques_moderes = nbMod;

  // top_3_priorites: sur risque_net, puis brut
  const all = next.unites.flatMap(u => (u as any).risques.map((r: any) => ({
    key: `${r.danger} – ${r.situation}`.slice(0,120),
    net: r.risque_net ?? r.priorite ?? 0,
    brut: r.priorite ?? 0
  })));
  
  all.sort((a,b) => (b.net - a.net) || (b.brut - a.brut));
  (next as any).synthese.top_3_priorites = all.slice(0,3).map(x => x.key);

  return next as DuerDoc;
}

/**
 * Sanitizes and normalizes a raw DUER candidate object from AI generation
 * before it's validated by the Zod schema.
 */
export function sanitizeDuerCandidate(input: any): DuerDoc {
  const candidate = input?.duer ?? input;
  // Ensure we have at least the basic structure
  const sanitized: any = {
    secteur: String(candidate.secteur || 'Non spécifié').slice(0, 200),
    date_generation: candidate.date_generation || new Date().toISOString(),
    unites: [],
    synthese: {
      nb_risques_critiques: 0,
      nb_risques_importants: 0,
      nb_risques_moderes: 0,
      top_3_priorites: [],
      budget_prevention_estime: '—',
      conformite_reglementaire: {
        points_forts: [],
        points_vigilance: []
      }
    }
  };

  // Process units
  if (Array.isArray(candidate.unites)) {
    sanitized.unites = candidate.unites.map((unit: any) => ({
      nom: String(unit?.nom || 'Unité sans nom').slice(0, 200),
      risques: []
    }));

    // Process risks for each unit
    candidate.unites.forEach((unit: any, unitIndex: number) => {
      if (!unit?.risques || !Array.isArray(unit.risques)) return;
      
      const sanitizedUnit = sanitized.unites[unitIndex];
      if (!sanitizedUnit) return;

      unit.risques.forEach((risk: any) => {
        if (!risk) return;

        // Ensure basic risk properties
        const sanitizedRisk: any = {
          id: String(risk.id || '').slice(0, 100) || undefined,
          danger: String(risk.danger || 'Danger non spécifié').slice(0, 500),
          situation: String(risk.situation || 'Situation non spécifiée').slice(0, 500),
          gravite: Math.max(1, Math.min(4, Number(risk.gravite) || 1)),
          probabilite: Math.max(1, Math.min(4, Number(risk.probabilite) || 1)),
          priorite: 0, // Will be calculated
          mesures_existantes: [],
          mesures_proposees: [],
          suivi: {}
        };

        // Calculate priority
        sanitizedRisk.priorite = sanitizedRisk.gravite * sanitizedRisk.probabilite;

        // Process existing measures
        if (Array.isArray(risk.mesures_existantes)) {
          sanitizedRisk.mesures_existantes = risk.mesures_existantes
            .filter(Boolean)
            .map((m: any) => String(m).slice(0, 500));
        }

        // Process proposed measures
        if (Array.isArray(risk.mesures_proposees)) {
          sanitizedRisk.mesures_proposees = risk.mesures_proposees
            .filter(isProposedMeasure)
            .map((measure: any) => {
              const result: IProposedMeasure = {
                type: safeString(measure.type, 100),
                description: safeString(measure.description, 1000)
              };
              
              if (measure.delai !== undefined && measure.delai !== null) {
                result.delai = safeString(measure.delai, 100);
              }
              if (measure.cout_estime !== undefined && measure.cout_estime !== null) {
                result.cout_estime = safeString(measure.cout_estime, 100);
              }
              if (measure.reference !== undefined && measure.reference !== null) {
                result.reference = safeString(measure.reference, 200);
              }
              
              return result;
            });
        }

        // Process follow-up
        if (risk.suivi && typeof risk.suivi === 'object') {
          const s = risk.suivi;
          sanitizedRisk.suivi = {
            responsable: s.responsable ? String(s.responsable).slice(0, 100) : undefined,
            echeance: s.echeance ? String(s.echeance).slice(0, 100) : undefined,
            indicateur: s.indicateur ? String(s.indicateur).slice(0, 200) : undefined
          };
        }

        sanitizedUnit.risques.push(sanitizedRisk);
      });
    });
  }

  // Process summary if it exists
  if (candidate.synthese && typeof candidate.synthese === 'object') {
    const syn = candidate.synthese;
    
    if (typeof syn.nb_risques_critiques === 'number') {
      sanitized.synthese.nb_risques_critiques = Math.max(0, Math.floor(syn.nb_risques_critiques));
    }
    if (typeof syn.nb_risques_importants === 'number') {
      sanitized.synthese.nb_risques_importants = Math.max(0, Math.floor(syn.nb_risques_importants));
    }
    if (typeof syn.nb_risques_moderes === 'number') {
      sanitized.synthese.nb_risques_moderes = Math.max(0, Math.floor(syn.nb_risques_moderes));
    }

    if (Array.isArray(syn.top_3_priorites)) {
      sanitized.synthese.top_3_priorites = syn.top_3_priorites
        .filter(Boolean)
        .map((p: any) => String(p).slice(0, 500))
        .slice(0, 3);
    }

    if (syn.budget_prevention_estime !== undefined) {
      sanitized.synthese.budget_prevention_estime = String(syn.budget_prevention_estime).slice(0, 100) || '—';
    }

    if (syn.conformite_reglementaire && typeof syn.conformite_reglementaire === 'object') {
      const conf = syn.conformite_reglementaire;
      if (Array.isArray(conf.points_forts)) {
        sanitized.synthese.conformite_reglementaire.points_forts = conf.points_forts
          .filter(Boolean)
          .map((p: any) => String(p).slice(0, 500));
      }
      if (Array.isArray(conf.points_vigilance)) {
        sanitized.synthese.conformite_reglementaire.points_vigilance = conf.points_vigilance
          .filter(Boolean)
          .map((p: any) => String(p).slice(0, 500));
      }
    }
  }

  return DuerSchema.parse(sanitized);
}

/** Vue plate pour export (1 ligne = 1 risque ; à dupliquer si 1-ligne-par-mesure côté XLSX) */
export function flattenDuer(doc: DuerDoc) {
  const out: any[] = [];
  doc.unites.forEach((u, ui) => {
    (u as any).risques.forEach((r: any, ri: number) => {
      out.push({
        unitId: (u as any).id || `U${ui}`,
        unitName: u.nom,
        riskId: r.id || `R${ui}-${ri}`,
        applicable: (r as any).applicable ?? true,
        danger: r.danger,
        situation: r.situation,
        gravite: r.gravite,
        probabilite: r.probabilite,
        priorite: r.priorite,
        maitrise: (r as any).maitrise ?? null,
        risque_net: (r as any).risque_net ?? r.priorite,
        effectifs_concernes: (r as any).effectifs_concernes ?? null,
        penibilite: (r as any).penibilite ?? null,
        mesures_existantes: r.mesures_existantes ?? [],
        mesures_proposees: r.mesures_proposees ?? [],
        suivi: r.suivi ?? {},
      });
    });
  });
  return out;
}
