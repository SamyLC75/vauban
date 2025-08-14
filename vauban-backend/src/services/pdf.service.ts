// src/services/pdf.service.ts
import PDFDocument from "pdfkit";

export function renderDuerPdf(id: string, docData: any, brand?: { logoPng?: Buffer; title?: string }) {
  const doc = new PDFDocument({ margin: 40, autoFirstPage: false });

  // Couverture
  doc.addPage();
  if (brand?.logoPng) doc.image(brand.logoPng, 40, 40, { width: 120 });
  doc.fontSize(22).text(brand?.title || "Document Unique d'Évaluation des Risques", { align: "center" });
  doc.moveDown(2).fontSize(12)
     .text(`Identifiant: ${id}`)
     .text(`Secteur: ${docData.secteur}`)
     .text(`Généré le: ${new Date(docData.date_generation).toLocaleString("fr-FR")}`);

  // Sommaire
  doc.addPage().fontSize(16).text("Sommaire", { underline: true }).moveDown();
  (docData.unites || []).forEach((u: any, i: number) => {
    doc.fontSize(12).text(`${i+1}. ${u.nom}`);
  });

  // Synthèse
  doc.addPage().fontSize(16).text("Synthèse", { underline: true }).moveDown();
  doc.fontSize(12)
    .text(`Nombre de risques critiques: ${docData.synthese?.nb_risques_critiques || 0}`)
    .text(`Nombre de risques importants: ${docData.synthese?.nb_risques_importants || 0}`)
    .text(`Nombre de risques modérés: ${docData.synthese?.nb_risques_moderes || 0}`)
    .text(`Budget prévention estimé: ${docData.synthese?.budget_prevention_estime || "—"}`);

  // Détail unités
  (docData.unites || []).forEach((u: any, i: number) => {
    doc.addPage().fontSize(16).text(u.nom, { underline: true }).moveDown();
    
    // Risques de l'unité
    (u.risques || []).forEach((r: any, j: number) => {
      doc.fontSize(12).text(`${j+1}. ${r.danger} (${r.situation})`, { indent: 20 });
      doc.fontSize(10)
        .text(`Gravité: ${r.gravite}`, { indent: 40 })
        .text(`Probabilité: ${r.probabilite}`, { indent: 40 })
        .text(`Priorité: ${r.priorite}`, { indent: 40 });
      
      // Mesures existantes
      if (r.mesures_existantes?.length) {
        doc.fontSize(12).text("Mesures existantes:", { indent: 40 });
        r.mesures_existantes.forEach((m: string) => {
          doc.fontSize(10).text(`- ${m}`, { indent: 60 });
        });
      }
      
      // Mesures proposées
      if (r.mesures_proposees?.length) {
        doc.fontSize(12).text("Mesures proposées:", { indent: 40 });
        r.mesures_proposees.forEach((m: any) => {
          doc.fontSize(10)
            .text(`- ${m.description}`, { indent: 60 })
            .text(`  Type: ${m.type}`, { indent: 80 })
            .text(`  Délai: ${m.delai || "—"}`, { indent: 80 })
            .text(`  Coût estimé: ${m.cout_estime || "—"}`, { indent: 80 })
            .text(`  Référence: ${m.reference || "—"}`, { indent: 80 });
        });
      }
      
      // Suivi
      if (r.suivi) {
        doc.fontSize(12).text("Suivi:", { indent: 40 });
        doc.fontSize(10)
          .text(`Responsable: ${r.suivi.responsable || "—"}`, { indent: 60 })
          .text(`Échéance: ${r.suivi.echeance || "—"}`, { indent: 60 })
          .text(`Indicateur: ${r.suivi.indicateur || "—"}`, { indent: 60 });
      }
    });
  });

  return doc;
}
