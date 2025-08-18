import Excel from "exceljs";

export async function exportDUERXlsx(doc: any) {
  const wb = new Excel.Workbook();

  // Feuille Synthèse
  const sh1 = wb.addWorksheet("Synthese");
  sh1.addRow(["Secteur", doc.secteur]);
  sh1.addRow(["Date génération", doc.date_generation]);
  sh1.addRow([]);
  sh1.addRow(["Nb risques critiques", doc.synthese?.nb_risques_critiques ?? 0]);
  sh1.addRow(["Nb risques importants", doc.synthese?.nb_risques_importants ?? 0]);
  sh1.addRow(["Nb risques modérés", doc.synthese?.nb_risques_moderes ?? 0]);

  // Feuille Détails
  const sh2 = wb.addWorksheet("Risques");
  sh2.addRow(["Unité", "Danger", "Situation", "Gravité", "Probabilité", "Priorité", "Mesures (liste)"]);
  for (const u of doc.unites ?? []) {
    for (const r of u.risques ?? []) {
      const mesures = (r.mesures ?? []).map((m: any) => `• ${m.titre || m.type || ""} ${m.description ? "— " + m.description : ""}`).join("\n");
      sh2.addRow([
        u.nom,
        r.danger ?? "",
        r.situation ?? "",
        r.gravite ?? "",
        r.probabilite ?? "",
        r.priorite ?? r.score ?? "",
        mesures
      ]);
    }
  }
  sh2.columns.forEach(c => { c.width = 30; });

  return wb;
}
