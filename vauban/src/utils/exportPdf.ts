import jsPDF from "jspdf";

// Tu peux enrichir ce template selon ton besoin réel
export function generateDUERPDF(duerData: any) {
  const doc = new jsPDF();
  doc.text("Document Unique d'Évaluation des Risques (DUER)", 10, 20);
  let y = 35;
  duerData.forEach((risk: any, i: number) => {
    doc.text(`Unité: ${risk.unite || ""}`, 10, y);
    doc.text(`Danger: ${risk.danger || ""}`, 70, y);
    doc.text(`Gravité: ${risk.gravite || ""}`, 130, y);
    doc.text(`Mesures: ${risk.mesures || ""}`, 10, y + 8);
    y += 18;
    if (y > 270) { doc.addPage(); y = 20; }
  });
  return doc;
}
