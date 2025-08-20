// src/utils/budget.ts
// Calcul du budget à partir des mesures DUER (cout_estime), sans aucun "coût app".
// Gère 3 formats: "€|€€|€€€", "1200€", "1000–2000€" (ou "1000-2000", "1k", "1,2k€", etc.)

export type BudgetLine = {
  unit: string;
  riskId?: string;
  measure: string;
  type?: string;
  delai?: string;
  min: number;
  max: number;
};

// Mapping pour les tags symboliques "€"
const TAG_RANGES = {
  "€":   { min: 100,  max: 500 },
  "€€":  { min: 500,  max: 2000 },
  "€€€": { min: 2000, max: 8000 },
};

// Util: normalise un nombre "1 200", "1 200", "1,2k", "1.2k", "≈1k"
function parseNumberToken(raw: string): number | null {
  const s = (raw || "")
    .toLowerCase()
    .replace(/[^\d.,k-]/g, "")  // garde chiffres, ., ,, k et -
    .replace(/,/g, ".")
    .trim();
  if (!s) return null;

  // 1000-2000 -> on ne traite pas ici (fait plus haut), on renvoie null
  if (s.includes("-")) return null;

  // "1.2k" / "1,2k" / "1k"
  if (s.endsWith("k")) {
    const n = Number(s.slice(0, -1));
    return isFinite(n) ? n * 1000 : null;
  }
  // "1200" / "1200.00"
  const n = Number(s);
  return isFinite(n) ? n : null;
}

// Retourne {min,max} à partir d'une chaîne "cout_estime"
export function parseCostString(input?: string): { min: number; max: number } | null {
  const raw = (input || "").toString().trim();
  if (!raw) return null;

  // 1) Tags symboliques "€", "€€", "€€€"
  const tag = raw.replace(/\s/g, "");
  if (TAG_RANGES[tag as keyof typeof TAG_RANGES]) {
    return TAG_RANGES[tag as keyof typeof TAG_RANGES];
  }

  // 2) Fourchette "1000–2000" (tirets différents) avec ou sans €
  const dash = raw.replace(/[€\s]/g, "").match(/(.+?)[–-](.+)/);
  if (dash) {
    const a = parseNumberToken(dash[1] || "");
    const b = parseNumberToken(dash[2] || "");
    if (a != null && b != null) {
      const min = Math.min(a, b);
      const max = Math.max(a, b);
      if (max > 0) return { min, max };
    }
  }

  // 3) Valeur unique "1200€" / "1,2k"
  const onlyNum = parseNumberToken(raw);
  if (onlyNum != null && onlyNum > 0) {
    return { min: onlyNum, max: onlyNum };
  }

  return null;
}

export function computeBudgetLines(doc: any): BudgetLine[] {
  const lines: BudgetLine[] = [];
  for (const u of doc?.unites ?? []) {
    for (const r of u?.risques ?? []) {
      for (const m of r?.mesures_proposees ?? []) {
        const br = parseCostString(m?.cout_estime);
        if (!br) continue;
        lines.push({
          unit: u?.nom ?? "",
          riskId: r?.id,
          measure: String(m?.description ?? "").trim(),
          type: m?.type,
          delai: m?.delai,
          min: br.min,
          max: br.max,
        });
      }
    }
  }
  return lines;
}

export function computeBudgetFromDoc(doc: any): string {
  const lines = computeBudgetLines(doc);
  const sum = (k: "min" | "max") => lines.reduce((a, b) => a + (b[k] || 0), 0);
  const min = sum("min");
  const max = sum("max");
  if (max <= 0) return doc?.synthese?.budget_prevention_estime || "—";
  const round50 = (n: number) => Math.round(n / 50) * 50;
  return `${round50(min)}–${round50(max)}€`;
}

export function computeBudgetDetails(
  doc: any,
  opts: { tvaRate?: number; subsidyRate?: number; subsidyOnTypes?: string[] } = {}
) {
  const { tvaRate = 0, subsidyRate = 0, subsidyOnTypes = ["collective", "individuelle", "formation"] } = opts;
  const lines = computeBudgetLines(doc);
  const sum = (arr: BudgetLine[], key: "min" | "max") => arr.reduce((a, b) => a + (b[key] || 0), 0);

  const baseMin = sum(lines, "min");
  const baseMax = sum(lines, "max");

  // TVA sur mesures
  const tvaMin = baseMin * (tvaRate || 0);
  const tvaMax = baseMax * (tvaRate || 0);

  // Aides/subventions : appliquées uniquement aux types éligibles
  const eligible = lines.filter((l) => !l.type || subsidyOnTypes.includes(l.type));
  const subMin = sum(eligible, "min") * (subsidyRate || 0);
  const subMax = sum(eligible, "max") * (subsidyRate || 0);

  const scenarioBase = { min: baseMin, max: baseMax };
  const scenarioWithTVA = { min: baseMin + tvaMin, max: baseMax + tvaMax };
  const scenarioNetSubsidy = {
    min: Math.max(0, scenarioWithTVA.min - subMin),
    max: Math.max(0, scenarioWithTVA.max - subMax),
  };

  const round50 = (n: number) => Math.round(n / 50) * 50;
  const fmt = (min: number, max: number) => `${round50(min)}–${round50(max)}€`;

  return {
    lines,
    totals: {
      base: { ...scenarioBase, label: fmt(scenarioBase.min, scenarioBase.max) },
      withTVA: { ...scenarioWithTVA, label: fmt(scenarioWithTVA.min, scenarioWithTVA.max) },
      netSubsidy: { ...scenarioNetSubsidy, label: fmt(scenarioNetSubsidy.min, scenarioNetSubsidy.max) },
    },
  };
}
