// src/services/duer-scope.service.ts
import { DuerDoc } from "../schemas/duer.schema";
import { getCategoryRegistry, DuerRelevance } from "./evidence/CategoryRegistry";

type RiskWithScope = { __relevance?: DuerRelevance };

export async function tagRelevanceOnDoc(doc: DuerDoc): Promise<DuerDoc> {
  const reg = await getCategoryRegistry();
  const next: DuerDoc = { ...doc, unites: doc.unites.map(u => ({ ...u, risques: u.risques.map(r => ({ ...r })) })) };

  for (const u of next.unites) {
    for (const r of u.risques as (typeof u.risques & RiskWithScope[])) {
      const hay = [
        r.danger, r.situation,
        (r.mesures_existantes||[]).join(" "),
        (r.mesures_proposees||[]).map((m:any) => m?.description).join(" ")
      ].join(" . ");
      const cats = reg.match(hay);
      // si aucune catégorie match, on laisse "direct" par défaut
      const rel: DuerRelevance =
        cats.length ? (reg.get(cats[0])?.duer_relevance ?? "direct") : "direct";
      (r as any).__relevance = rel;
    }
  }
  return next;
}

export async function splitDocByRelevance(doc: DuerDoc): Promise<{ main: DuerDoc; annex: DuerDoc }> {
  const tagged = await tagRelevanceOnDoc(doc);
  const main: DuerDoc = { ...tagged, unites: [] };
  const annex: DuerDoc = { ...tagged, unites: [] };

  for (const u of tagged.unites) {
    const directRisks = u.risques.filter((r: any) => (r.__relevance ?? "direct") === "direct");
    const annexRisks  = u.risques.filter((r: any) => (r.__relevance ?? "direct") !== "direct");

    if (directRisks.length) main.unites.push({ nom: u.nom, risques: directRisks });
    if (annexRisks.length)  annex.unites.push({ nom: u.nom, risques: annexRisks });
  }

  // copier synthèse uniquement pour le main — l’annexe est un complément narratif
  (main as any).synthese = tagged.synthese;
  (annex as any).synthese = {
    nb_risques_critiques: 0,
    nb_risques_importants: 0,
    nb_risques_moderes: 0,
    top_3_priorites: [],
    budget_prevention_estime: "—",
    conformite_reglementaire: { points_forts: [], points_vigilance: [] }
  };

  return { main, annex };
}
