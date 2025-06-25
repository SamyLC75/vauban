import React, { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { loadRisks } from "../utils/storage";
import { loadPCA } from "../utils/pcaStorage";
import { getExportHistory } from "../utils/exportHistory";
import { loadActions } from "../utils/actionStorage";
import { generateDUERPDF } from "../utils/exportPdf";
import { generatePCAPDF } from "../utils/exportPdfPCA";
import { generateActionsPDF } from "../utils/exportPdfActions";
import { Button } from "../components/ui/Button";
import Badge from "../components/ui/Badge";

export default function PdfExportPage() {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const handleExport = (type: "duer" | "pca" | "actions") => {
    setError(""); setSuccess("");
    if (key.length < 6) {
      setError("Clé trop courte");
      return;
    }
    try {
      if (type === "duer") {
        const risks = loadRisks(key);
        if (!risks.length) throw new Error();
        generateDUERPDF(risks).save("DUER.pdf");
        setSuccess("DUER exporté !");
      }
      if (type === "pca") {
        const pca = loadPCA(key);
        if (!pca) throw new Error();
        generatePCAPDF(pca).save("PCA.pdf");
        setSuccess("PCA exporté !");
      }
      if (type === "actions") {
        const actions = loadActions(key);
        if (!actions.length) throw new Error();
        generateActionsPDF(actions).save("PlanActions.pdf");
        setSuccess("Plan d’actions exporté !");
      }
    } catch (e) {
      setError("Impossible de générer le PDF (clé incorrecte ou aucune donnée)");
    }
  };
  const handleExportAll = async () => {
    setError(""); setSuccess("");
    if (key.length < 6) {
      setError("Clé trop courte");
      return;
    }
    try {
      const zip = new JSZip();
  
      // DUER
      const risks = loadRisks(key);
      if (risks.length) {
        const pdf = generateDUERPDF(risks);
        zip.file("DUER.pdf", pdf.output("arraybuffer"));
      }
  
      // PCA
      const pca = loadPCA(key);
      if (pca) {
        const pdf = generatePCAPDF(pca);
        zip.file("PCA.pdf", pdf.output("arraybuffer"));
      }
  
      // Plan d’actions
      const actions = loadActions(key);
      if (actions.length) {
        const pdf = generateActionsPDF(actions);
        zip.file("PlanActions.pdf", pdf.output("arraybuffer"));
      }
  
      // Générer et télécharger le ZIP
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "DocumentsCrise.zip");
      setSuccess("Export ZIP complet !");
    } catch (e) {
      setError("Impossible d’exporter (clé incorrecte ou aucune donnée)");
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Export PDF sécurisé</h1>
      <div className="mb-4 flex items-center gap-3">
        <input
          className="input"
          placeholder="Clé de déchiffrement"
          value={key}
          onChange={e => setKey(e.target.value)}
          type="password"
        />
      </div>
      <div className="flex gap-3 mb-4">
        <Button onClick={() => handleExport("duer")}>Exporter le DUER</Button>
        <Button onClick={() => handleExport("pca")}>Exporter le PCA</Button>
        <Button onClick={() => handleExport("actions")}>Exporter le plan d’actions</Button>
        <Button onClick={handleExportAll}>Exporter tous les documents</Button>
      </div>
      <div className="mt-6">
        <h2 className="font-bold mb-2">Historique des exports</h2>
        <ul className="text-sm text-gray-700">
          {getExportHistory().map((h: any, i: number) => (
            <li key={i}>
              {h.docName} exporté le {new Date(h.date).toLocaleString("fr-FR")}
            </li>
           ))}
        </ul>
      </div>

      {success && <Badge color="blue">{success}</Badge>}
      {error && <Badge color="red">{error}</Badge>}
      <div className="bg-blue-100 border p-4 rounded text-lg text-blue-900 mt-4">
        Pour télécharger un PDF lisible, saisissez votre clé de déchiffrement locale.<br />
        <span className="italic text-blue-800">Aucune donnée ne quitte jamais votre ordinateur.</span>
      </div>
    </div>
  );
}
