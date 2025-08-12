import jsPDF from "jspdf";
import { PreventionAction } from "../types/action";

export function generateActionsPDF(actions: PreventionAction[]) {
  const doc = new jsPDF();
  doc.text("Plan d’actions de prévention", 10, 20);
  let y = 35;
  actions.forEach((a, i) => {
    doc.text(`- Action : ${a.description || ""}`, 10, y);
    doc.text(`Responsable : ${a.responsable || ""}`, 80, y);
    doc.text(`Deadline : ${a.deadline || ""}`, 10, y + 8);
    doc.text(`Statut : ${a.status || ""}`, 80, y + 8);
    y += 18;
    if (y > 270) { doc.addPage(); y = 20; }
  });
  return doc;
}
