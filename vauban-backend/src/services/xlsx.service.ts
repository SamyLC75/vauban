// src/services/xlsx.service.ts
import ExcelJS from "exceljs";
import type { DuerDoc } from "../schemas/duer.schema";
import { normalizeDuerDoc, flattenDuer } from "./duer-normalize.service";
import { probToLabel, gravToLabel, calculerHierarchie } from "../utils/carsat";
import { tagRelevanceOnDoc } from "./duer-scope.service";

/**
 * Génère un classeur Excel “expert-grade” à partir d’un DUER normalisé.
 * Feuilles :
 *  - Évaluation des risques : 1 ligne = 1 risque (édition possible : Gravité, Probabilité, Maîtrise, Effectifs, Pénibilité, Applicabilité, Suivi...)
 *  - Plan d’action : détail des mesures proposées par risque
 *  - Paramètres : coefficients de maîtrise & listes (source des validations)
 */
export async function exportDUERXlsx(doc: DuerDoc): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Vauban";
  wb.created = new Date();

  // === 0) Normaliser + aplatir
  const normalized = normalizeDuerDoc(doc);
  const rows = flattenDuer(normalized);
  const normalizedTagged = await tagRelevanceOnDoc(normalized);

  // === 1) Feuille Paramètres
  const wsP = wb.addWorksheet("Paramètres", { views: [{ state: "frozen", ySplit: 1 }] });

  wsP.columns = [
    { header: "Clé", key: "k", width: 25 },
    { header: "Valeur", key: "v", width: 20 },
    { header: "Commentaire", key: "c", width: 40 },
  ];

  // Bloc 1 : Maîtrise -> coefficient
  wsP.addRow(["SECTION", "Coeff. Maîtrise", ""]);
  wsP.addRow(["AUCUNE", 0, "Aucune réduction du risque brut"]);
  wsP.addRow(["PARTIELLE", 0.5, "Réduction partielle"]);
  wsP.addRow(["BONNE", 0.7, "Réduction significative"]);
  wsP.addRow(["TRES_BONNE", 0.9, "Réduction très forte"]);
  const maitriseStart = 2; // ligne 2
  const maitriseEnd = 5;   // ligne 5

  wsP.addRow([]);
  wsP.addRow(["SECTION", "Listes", ""]);
  wsP.addRow(["LISTE_MAITRISE", "AUCUNE,PARTIELLE,BONNE,TRES_BONNE", "Source pour validation"]);
  wsP.addRow(["LISTE_OUI_NON", "Oui,Non", "Source pour pénibilité/applicabilité"]);
  wsP.addRow(["LISTE_TYPE_MESURE", "collective,individuelle,formation", "Types de mesure"]);

  // Seuils (à titre d’info – non utilisés pour CF car exceljs ne gère pas nativement la CF)
  wsP.addRow([]);
  wsP.addRow(["SECTION", "Seuils Criticité (Risque NET)", ""]);
  wsP.addRow(["CRITIQUE_MIN", 12, ">= 12"]);
  wsP.addRow(["IMPORTANT_MIN", 8, "8–11"]);
  wsP.addRow(["MODERE_MIN", 4, "4–7"]);

  // style header Paramètres
  wsP.getRow(1).font = { bold: true };
  wsP.getRow(7).font = { bold: true };
  wsP.getRow(11).font = { bold: true };

  // === 2) Feuille Évaluation des risques
  const wsE = wb.addWorksheet("Évaluation des risques", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const EHeaders = [
    { header: "Unité", key: "unitName", width: 22 },
    { header: "Applicabilité", key: "applicable", width: 14 },
    { header: "Danger", key: "danger", width: 28 },
    { header: "Situation", key: "situation", width: 36 },
    { header: "Gravité (1–4)", key: "gravite", width: 14 },
    { header: "Probabilité (1–4)", key: "probabilite", width: 16 },
    { header: "Risque BRUT", key: "brut", width: 14 },
    { header: "Maîtrise", key: "maitrise", width: 16 },
    { header: "Coeff.", key: "coeff", width: 10 },
    { header: "Risque NET", key: "net", width: 14 },
    { header: "Effectifs exposés", key: "effectifs", width: 16 },
    { header: "Pénibilité", key: "penibilite", width: 12 },
    { header: "Mesures existantes", key: "mex", width: 28 },
    { header: "Mesures proposées (synthèse)", key: "mpr", width: 36 },
    { header: "Suivi — Responsable", key: "suiv_resp", width: 20 },
    { header: "Suivi — Échéance", key: "suiv_ech", width: 16 },
    { header: "Suivi — Date décision", key: "suiv_dec", width: 16 },
    { header: "Suivi — Réalisé le", key: "suiv_real", width: 16 },
    { header: "Suivi — Indicateur", key: "suiv_kpi", width: 22 },
    // colonnes techniques (non visibles) — ids
    { header: "_unitId", key: "_unitId", width: 18 },
    { header: "_riskId", key: "_riskId", width: 18 },
  ];
  wsE.columns = EHeaders;

  // header style
  wsE.getRow(1).font = { bold: true };
  wsE.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: EHeaders.length },
  };

  // Ajout des lignes
  const toTextList = (a: any[]) => (Array.isArray(a) ? a : []).map((s) => (typeof s === "string" ? s : JSON.stringify(s))).join(" • ");
  rows.forEach((r, i) => {
    const line = wsE.addRow({
      unitName: r.unitName,
      applicable: r.applicable ? "Oui" : "Non",
      danger: r.danger,
      situation: r.situation,
      gravite: Number(r.gravite) || 1,
      probabilite: Number(r.probabilite) || 1,
      brut: undefined, // formula after
      maitrise: r.maitrise ?? "AUCUNE",
      coeff: undefined, // formula after
      net: undefined,   // formula after
      effectifs: r.effectifs_concernes ?? "",
      penibilite: r.penibilite === null ? "" : (r.penibilite ? "Oui" : "Non"),
      mex: toTextList(r.mesures_existantes),
      mpr: toTextList((r.mesures_proposees || []).map((m: any) => m?.description).filter(Boolean)),
      suiv_resp: r.suivi?.responsable || "",
      suiv_ech: r.suivi?.echeance || "",
      suiv_dec: r.suivi?.date_decision || "",
      suiv_real: r.suivi?.realise_le || "",
      suiv_kpi: r.suivi?.indicateur || "",
      _unitId: r.unitId,
      _riskId: r.riskId,
    });

    // Formules et validations
    const rowIdx = line.number;
    const cGrav = wsE.getCell(rowIdx, colOf(wsE, "gravite"));
    const cProb = wsE.getCell(rowIdx, colOf(wsE, "probabilite"));
    const cBrut = wsE.getCell(rowIdx, colOf(wsE, "brut"));
    const cMait = wsE.getCell(rowIdx, colOf(wsE, "maitrise"));
    const cCoeff = wsE.getCell(rowIdx, colOf(wsE, "coeff"));
    const cNet = wsE.getCell(rowIdx, colOf(wsE, "net"));
    const cApp = wsE.getCell(rowIdx, colOf(wsE, "applicable"));
    const cPen = wsE.getCell(rowIdx, colOf(wsE, "penibilite"));

    // Brut = Gravité × Probabilité
    cBrut.value = { formula: `${cGrav.address}*${cProb.address}` };

    // Coeff (VLOOKUP sur Paramètres!A2:B5)
    // =IFERROR(VLOOKUP(Maîtrise, Paramètres!$A$2:$B$5, 2, FALSE), 0)
    cCoeff.value = {
      formula: `IFERROR(VLOOKUP(${cMait.address},Paramètres!$A$${maitriseStart}:$B$${maitriseEnd},2,FALSE),0)`,
    };

    // Net = CEILING( Brut * (1 - Coeff), 1 )
    cNet.value = { formula: `CEILING(${cBrut.address}*(1-${cCoeff.address}),1)` };

    // Validations
    cGrav.dataValidation = {
      type: "whole",
      operator: "between",
      allowBlank: false,
      formulae: [1, 4],
      showErrorMessage: true,
      errorTitle: "Valeur invalide",
      error: "Gravité doit être un entier entre 1 et 4.",
    };
    cProb.dataValidation = {
      type: "whole",
      operator: "between",
      allowBlank: false,
      formulae: [1, 4],
      showErrorMessage: true,
      errorTitle: "Valeur invalide",
      error: "Probabilité doit être un entier entre 1 et 4.",
    };
    cMait.dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['Paramètres!$A$3:$A$5'], // AUCUNE..TRES_BONNE (lignes 2..5 -> mais on évite la ligne SECTION à 1)
    };
    cApp.dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"Oui,Non"'],
    };
    cPen.dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Oui,Non"'],
    };

    // Mise en forme rapide (lecture)
    [cBrut, cNet].forEach((c) => (c.numFmt = "0"));
  });

  // style
  wsE.getRow(1).height = 22;
  wsE.getRow(1).eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    c.border = { bottom: { style: "thin", color: { argb: "FFCBD5E1" } } };
  });

  // Zone d’impression
  wsE.pageSetup.printArea = `A1:${wsE.getRow(1).getCell(EHeaders.length).address}`;

  // === 3) Feuille Plan d’action
  const wsA = wb.addWorksheet("Plan d’action", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const AHeaders = [
    { header: "Unité", key: "unitName", width: 20 },
    { header: "Risque (Danger)", key: "danger", width: 28 },
    { header: "Mesure", key: "mesure", width: 44 },
    { header: "Type", key: "type", width: 16 },
    { header: "Délai", key: "delai", width: 16 },
    { header: "Coût estimé", key: "cout", width: 16 },
    { header: "Référence", key: "ref", width: 24 },
    { header: "Responsable", key: "resp", width: 20 },
    { header: "Échéance", key: "echeance", width: 18 },
    { header: "Indicateur", key: "kpi", width: 24 },
    // ids techniques
    { header: "_unitId", key: "_unitId", width: 18 },
    { header: "_riskId", key: "_riskId", width: 18 },
  ];
  wsA.columns = AHeaders;
  wsA.getRow(1).font = { bold: true };
  wsA.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: AHeaders.length } };

  // Déplier les mesures proposées — 1 ligne par mesure
  normalized.unites.forEach((u: any) => {
    u.risques.forEach((r: any) => {
      const mesures = Array.isArray(r.mesures_proposees) ? r.mesures_proposees : [];
      if (mesures.length === 0) {
        // ligne vide (pour planifier plus tard)
        wsA.addRow({
          unitName: u.nom,
          danger: r.danger,
          mesure: "",
          type: "",
          delai: "",
          cout: "",
          ref: "",
          resp: r.suivi?.responsable || "",
          echeance: r.suivi?.echeance || "",
          kpi: r.suivi?.indicateur || "",
          _unitId: (u as any).id,
          _riskId: r.id,
        });
      } else {
        mesures.forEach((m: any) => {
          wsA.addRow({
            unitName: u.nom,
            danger: r.danger,
            mesure: m?.description || "",
            type: m?.type || "",
            delai: m?.delai || "",
            cout: m?.cout_estime || "",
            ref: m?.reference || "",
            resp: r.suivi?.responsable || "",
            echeance: r.suivi?.echeance || "",
            kpi: r.suivi?.indicateur || "",
            _unitId: (u as any).id,
            _riskId: r.id,
          });
        });
      }
    });
  });

  // Validations de listes
  for (let i = 2; i <= wsA.rowCount; i++) {
    const cType = wsA.getCell(i, colOf(wsA, "type"));
    cType.dataValidation = { type: "list", allowBlank: true, formulae: ['"collective,individuelle,formation"'] };
    const cDelai = wsA.getCell(i, colOf(wsA, "delai"));
    cDelai.dataValidation = { type: "list", allowBlank: true, formulae: ['"immédiat,court_terme,moyen_terme,long_terme"'] };
  }

  // Style entête Plan d’action
  wsA.getRow(1).eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    c.border = { bottom: { style: "thin", color: { argb: "FFCBD5E1" } } };
  });
  // === 4) Feuille Annexes (indirect)
  const wsX = wb.addWorksheet("Annexes (indirect)", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { paperSize: 9, orientation: "portrait" }
  });
  wsX.columns = [
    { header: "Unité", key: "unit", width: 22 },
    { header: "Danger", key: "danger", width: 28 },
    { header: "Situation", key: "sit", width: 42 },
    { header: "Relevance", key: "rel", width: 14 },
    { header: "Mesures existantes", key: "mex", width: 36 },
    { header: "Mesures proposées", key: "mpr", width: 42 },
  ];
  wsX.getRow(1).font = { bold: true };

  (normalizedTagged.unites || []).forEach((u: any) => {
    (u.risques || []).forEach((r: any) => {
      const rel = (r.__relevance || "direct");
      if (rel === "direct") return;
      wsX.addRow({
        unit: u.nom,
        danger: r.danger,
        sit: r.situation,
        rel,
        mex: (r.mesures_existantes || []).join(" • "),
        mpr: (r.mesures_proposees || []).map((m: any) => m?.description).filter(Boolean).join(" • ")
      });
    });
  });

  return wb;
}

/**
 * Get column index by key
 */
function colOf(ws: ExcelJS.Worksheet, key: string): number {
  const col = ws.getColumn(key);
  return col ? col.number : 0;
}

/**
 * Export réglementaire simplifié pour le DUER (format CARSAT)
 * 1 feuille avec les colonnes : Unité, Danger, Situation, Gravité, Probabilité, etc.
 */
export async function exportRegulatoryXlsx(doc: DuerDoc): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Vauban";
  wb.created = new Date();

  // Normaliser le document
  const normalized = normalizeDuerDoc(doc);
  
  // Créer la feuille principale
  const ws = wb.addWorksheet("DUERP");
  
  // En-têtes
  const headers = [
    "Unité", "Danger", "Situation",
    "Gravité (1-4)", "Gravité (libellé)",
    "Probabilité (1-4)", "Probabilité (libellé)",
    "Hiérarchie CARSAT", "Priorité",
    "Effectifs exposés", "Pénibilité",
    "Mesures existantes",
    "Type mesure", "Description", "Délai", "Coût", "Responsable", "Échéance", "Indicateur"
  ];
  
  ws.addRow(headers);
  
  // Parcourir les unités et les risques
  for (const unite of normalized.unites || []) {
    for (const risque of unite.risques || []) {
      const gravite = Number(risque.gravite) || 1;
      const probabilite = Number(risque.probabilite) || 1;
      const graviteLabel = gravToLabel(gravite);
      const probabiliteLabel = probToLabel(probabilite);
      const hierarchie = calculerHierarchie(probabiliteLabel, graviteLabel);
      const hierarchieGlyph = hierarchie === 1 ? "➊" : hierarchie === 2 ? "➋" : "➌";
      
      // Ligne de base (sans mesures)
      const baseRow = [
        unite.nom,
        risque.danger || "",
        risque.situation || "",
        gravite,
        graviteLabel,
        probabilite,
        probabiliteLabel,
        hierarchieGlyph,
        risque.priorite || "",
        risque.effectifs_concernes || "",
        risque.penibilite ? "Oui" : "Non",
        (risque.mesures_existantes || []).join(" ") || ""
      ];
      
      // Ajouter les mesures proposées (une ligne par mesure)
      const mesures = risque.mesures_proposees || [];
      if (mesures.length > 0) {
        for (const mesure of mesures) {
          ws.addRow([
            ...baseRow,
            mesure.type || "",
            mesure.description || "",
            mesure.delai || "",
            mesure.cout_estime || "",
            risque.suivi?.responsable || "",
            risque.suivi?.echeance || "",
            risque.suivi?.indicateur || ""
          ]);
        }
      } else {
        // Si pas de mesures, on ajoute une ligne vide pour les colonnes de mesure
        ws.addRow([
          ...baseRow,
          "", "", "", "", risque.suivi?.responsable || "", risque.suivi?.echeance || "", risque.suivi?.indicateur || ""
        ]);
      }
    }
  }
  
  // Mise en forme
  ws.columns.forEach(column => {
    column.width = Math.min(30, Math.max(10, column.header ? column.header.length : 10));
  });
  
  // Style de l'en-tête
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' } // gris clair
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };
  });
  
  // Geler la première ligne
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  
  return wb;
}
