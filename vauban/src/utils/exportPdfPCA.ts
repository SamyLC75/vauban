import jsPDF from "jspdf";
import { PCAPlan } from "../types/pca";

export function generatePCAPDF(pca: PCAPlan) {
  const doc = new jsPDF();
  doc.text("Plan de Continuité d'Activité (PCA)", 10, 20);
  let y = 35;
  doc.text(`Nom du plan : ${pca.nom}`, 10, y);
  y += 10;
  doc.text(`Scénarios : ${pca.scenarios.join(", ")}`, 10, y);
  y += 10;
  doc.text("Processus critiques :", 10, y);
  y += 8;
  pca.processus.forEach((proc, i) => {
    doc.text(`- ${proc.nom || ""} (Resp. : ${proc.responsable || ""})`, 12, y);
    doc.text(`Mode de secours : ${proc.modeDeSecours || ""}`, 14, y + 7);
    doc.text(`Ressources : ${proc.ressourcesNecessaires || ""}`, 14, y + 14);
    y += 22;
    if (y > 270) { doc.addPage(); y = 20; }
  });
  doc.text("Mesures générales :", 10, y);
  doc.text(pca.mesuresGenerales || "", 14, y + 8);
  return doc;
}
