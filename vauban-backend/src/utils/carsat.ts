// Mapping CARSAT conforme Prév.317, sans changer le schéma DUER (1..4)
export type ProbLabel = "FAible" | "MOyenne" | "FOrte";
export type GravLabel = "Mortel" | "DReversible" | "DIrreversible";

export function probToLabel(p?: number): ProbLabel {
  if (!p || p <= 1) return "FAible";
  if (p === 2) return "MOyenne";
  return "FOrte"; // 3..4
}

export function gravToLabel(g?: number): GravLabel {
  if (!g || g <= 2) return "DReversible";
  if (g === 3) return "DIrreversible";
  return "Mortel"; // 4
}

export function hierToGlyph(h: 1|2|3) {
  return h === 1 ? "➊" : h === 2 ? "➋" : "➌";
}

// Matrice officielle (lecture hiérarchique)
export function calculerHierarchie(prob: ProbLabel, grav: GravLabel): 1|2|3 {
  const m: Record<ProbLabel, Record<GravLabel, 1|2|3>> = {
    FAible: { DReversible: 3, DIrreversible: 3, Mortel: 2 },
    MOyenne:{ DReversible: 2, DIrreversible: 2, Mortel: 1 },
    FOrte:  { DReversible: 1, DIrreversible: 1, Mortel: 1 },
  };
  return m[prob][grav];
}

// -------- Budget : agrégation robuste à partir de cout_estime --------
type BudgetRange = { min: number; max: number };
const SYMBOL_BUDGET: Record<string, BudgetRange> = {
  "€":   { min: 100,  max: 500   },
  "€€":  { min: 500,  max: 3000  },
  "€€€": { min: 3000, max: 10000 },
};

function parseEuro(s?: string): BudgetRange | null {
  if (!s) return null;
  const t = s.trim();
  if (SYMBOL_BUDGET[t]) return SYMBOL_BUDGET[t];
  const m = t.match(/(\d[\d\s]*)(?:\s*-\s*(\d[\d\s]*))?\s*€?/i);
  if (!m) return null;
  const n1 = Number(m[1].replace(/\s/g, "")) || 0;
  const n2 = m[2] ? Number(m[2].replace(/\s/g, "")) : n1;
  if (!n1 && !n2) return null;
  return { min: Math.min(n1,n2), max: Math.max(n1,n2) };
}

export function computeBudgetFromDoc(doc: any): string {
  let min = 0, max = 0;
  for (const u of doc?.unites ?? []) {
    for (const r of u?.risques ?? []) {
      for (const m of r?.mesures_proposees ?? []) {
        const br = parseEuro(m?.cout_estime);
        if (br) { min += br.min; max += br.max; }
      }
    }
  }
  if (max <= 0) return doc?.synthese?.budget_prevention_estime || "—";
  // arrondi propre
  const round50 = (n:number)=>Math.round(n/50)*50;
  return `${round50(min)}–${round50(max)}€`;
}

// -------- Synthèse conforme (critique/important/modéré = 1/2/3) --------
export function enforceConformiteSynthese(doc: any) {
  let c1=0,c2=0,c3=0;
  for (const u of doc?.unites ?? []) {
    for (const r of u?.risques ?? []) {
      const p = probToLabel(Number(r?.probabilite));
      const g = gravToLabel(Number(r?.gravite));
      const h = calculerHierarchie(p,g);
      if (h===1) c1++; else if (h===2) c2++; else c3++;
      // on peut attacher les labels au runtime pour UI/export (non persisté)
      r.__carsat = { prob_label: p, grav_label: g, hierarchie: h };
    }
  }
  doc.synthese = {
    ...(doc.synthese || {}),
    nb_risques_critiques: c1,
    nb_risques_importants: c2,
    nb_risques_moderes: c3,
    budget_prevention_estime: computeBudgetFromDoc(doc),
  };
  return doc;
}
