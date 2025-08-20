// src/services/duer-normalize.service.ts
import { DuerDoc, DuerSchema } from "../schemas/duer.schema";

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

function slug(s: string) {
  return String(s || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function normalizeDuerDoc(doc: DuerDoc): DuerDoc {
  const next = { ...doc, unites: [...doc.unites] };

  next.unites = next.unites.map((u, uIdx) => {
    const uId = (u as any).id || `U${uIdx}-${slug(u.nom)}`;
    const risques = (u.risques || []).map((r, rIdx) => {
      const rId = (r as any).id || `R${uIdx}-${rIdx}-${slug(r.danger)}-${slug(r.situation)}`;
      const grav = Number(r.gravite) || 1;
      const prob = Number(r.probabilite) || 1;
      const priorite = Number.isFinite(r.priorite) ? r.priorite : (grav * prob);
      return { ...r, id: rId, gravite: grav, probabilite: prob, priorite };
    });
    return { ...u, id: uId, risques };
  });

  // garde-fou synthèse
  next.synthese = next.synthese || {
    nb_risques_critiques: 0,
    nb_risques_importants: 0,
    nb_risques_moderes: 0,
    top_3_priorites: [],
    budget_prevention_estime: "—",
  };

  return next;
}

/**
 * Sanitizes and normalizes a raw DUER candidate object from AI generation
 * before it's validated by the Zod schema.
 */
export function sanitizeDuerCandidate(candidate: DuerCandidate): DuerDoc {
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
    sanitized.unites = candidate.unites.map(unit => ({
      nom: String(unit?.nom || 'Unité sans nom').slice(0, 200),
      risques: []
    }));

    // Process risks for each unit
    candidate.unites.forEach((unit, unitIndex) => {
      if (!unit?.risques || !Array.isArray(unit.risques)) return;
      
      const sanitizedUnit = sanitized.unites[unitIndex];
      if (!sanitizedUnit) return;

      unit.risques.forEach(risk => {
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
            .map(m => String(m).slice(0, 500));
        }

        // Process proposed measures
        if (Array.isArray(risk.mesures_proposees)) {
          sanitizedRisk.mesures_proposees = risk.mesures_proposees
            .filter(isProposedMeasure)
            .map(measure => {
              const result: IProposedMeasure = {
                type: safeString(measure.type, 100),
                description: safeString(measure.description, 1000)
              };
              
              // Add optional fields if they exist
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
    
    // Update risk counts
    if (typeof syn.nb_risques_critiques === 'number') {
      sanitized.synthese.nb_risques_critiques = Math.max(0, Math.floor(syn.nb_risques_critiques));
    }
    
    if (typeof syn.nb_risques_importants === 'number') {
      sanitized.synthese.nb_risques_importants = Math.max(0, Math.floor(syn.nb_risques_importants));
    }
    
    if (typeof syn.nb_risques_moderes === 'number') {
      sanitized.synthese.nb_risques_moderes = Math.max(0, Math.floor(syn.nb_risques_moderes));
    }

    // Process top priorities
    if (Array.isArray(syn.top_3_priorites)) {
      sanitized.synthese.top_3_priorites = syn.top_3_priorites
        .filter(Boolean)
        .map(p => String(p).slice(0, 500))
        .slice(0, 3);
    }

    // Process budget
    if (syn.budget_prevention_estime !== undefined) {
      sanitized.synthese.budget_prevention_estime = String(syn.budget_prevention_estime).slice(0, 100) || '—';
    }

    // Process regulatory compliance
    if (syn.conformite_reglementaire && typeof syn.conformite_reglementaire === 'object') {
      const conf = syn.conformite_reglementaire;
      
      if (Array.isArray(conf.points_forts)) {
        sanitized.synthese.conformite_reglementaire.points_forts = conf.points_forts
          .filter(Boolean)
          .map(p => String(p).slice(0, 500));
      }
      
      if (Array.isArray(conf.points_vigilance)) {
        sanitized.synthese.conformite_reglementaire.points_vigilance = conf.points_vigilance
          .filter(Boolean)
          .map(p => String(p).slice(0, 500));
      }
    }
  }

  // Finally, validate with Zod to ensure we return a valid DuerDoc
  return DuerSchema.parse(sanitized);
}

export function flattenDuer(doc: DuerDoc) {
  const rows = [];
  for (const u of doc.unites) {
    for (const r of u.risques) {
      rows.push({
        unitId: (u as any).id || u.nom,
        unitName: u.nom,
        riskId: (r as any).id || `${u.nom}-${r.danger}-${r.situation}`,
        danger: r.danger,
        situation: r.situation,
        gravite: r.gravite,
        probabilite: r.probabilite,
        priorite: r.priorite,
        mesures_existantes: r.mesures_existantes || [],
        mesures_proposees: r.mesures_proposees || [],
        suivi: r.suivi || {},
      });
    }
  }
  return rows;
}
