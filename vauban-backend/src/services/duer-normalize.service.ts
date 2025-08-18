// src/services/duer-normalize.service.ts
import { DuerDoc } from "../schemas/duer.schema";

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
