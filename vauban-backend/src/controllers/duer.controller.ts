import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { DuerSchema, DuerDoc } from "../schemas/duer.schema";
import { DuerEngine } from "../services/duer.engine";
import { normalizeDuerDoc, flattenDuer, sanitizeDuerCandidate } from "../services/duer-normalize.service";
import { 
  enhanceWithOrgRisks, 
  filterRisksInScope,
  applyAnswersToDoc, 
  recomputePriorities,
  smartifyMeasures 
} from "../services/duer-enhance.service";
import { MistralProvider } from "../services/mistral.provider";
import { DuerRepo } from "../repositories/duer.repo";
import { renderDuerPdf } from "../services/pdf.service";
import { DUERPromptsService } from "../services/duer-prompts.service"; // pour ia-explain
import { DuerDynamicService } from "../services/duer-dynamic.service";
import { DuerSuggestService } from "../services/duer-suggest.service";
import { DuerAuditService } from "../services/duer-audit.service";
import { SizeClass } from ".prisma/client";
import { prisma } from "../services/prisma";
import { encryptJson, decryptJson } from "../services/crypto.service";
import { enforceConformiteSynthese, probToLabel, gravToLabel, calculerHierarchie, computeBudgetFromDoc } from "../utils/carsat";
import { SlotFillingService, SlotNextInput } from "../services/slot-filling.service";
import { DefaultAIProvider } from "../services/ai.provider";

/* ============================
 * PUT /api/duer/:id
 * ============================ */
export const saveDUER = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const row = await DuerRepo.getOne(id);
    if (!row || row.orgId !== req.user!.orgId) return res.status(404).json({ error: "DUER non trouvé" });

    const edited = DuerSchema.parse(req.body?.duer ?? req.body); // accepte {duer:...} ou direct
    const normalized = normalizeDuerDoc(edited);
    await DuerRepo.update(id, normalized);
    return res.status(200).json({ success: true, duer: normalized });
  } catch (e: any) {
    return res.status(400).json({ error: "DUER invalide", message: e?.message });
  }
};

const engine = new DuerEngine(new MistralProvider());
const prompts = new DUERPromptsService();
const dynamicService = new DuerDynamicService(new MistralProvider());
const suggestService = new DuerSuggestService(new MistralProvider());
const auditService = new DuerAuditService();

/* ============================
 * POST /api/duer/ia-audit
 * ============================ */
export const iaAudit = async (req: AuthRequest, res: Response) => {
  try {
    const body = (req.body || {}) as { doc?: any; sector?: string; unites?: string[] };
    const doc = body?.doc?.duer || body?.doc || body;
    if (!doc?.unites) return res.status(400).json({ error: "DOC_REQUIRED", message: "Body must contain {doc} au format DuerDoc." });
    const report = await auditService.audit(doc, { sector: body.sector, unites: body.unites });
    return res.status(200).json({ report });
  } catch (e: any) {
    return res.status(500).json({ error: "AUDIT_ERROR", message: e?.message });
  }
};

/* ============================
 * POST /api/duer/:id/ia-audit
 * ============================ */
export const iaAuditById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const row = await DuerRepo.getOne(id);
    if (!row || row.orgId !== req.user!.orgId) return res.status(404).json({ error: "DUER non trouvé" });
    const report = await auditService.audit(row.doc, { 
      sector: row.sector, 
      unites: row.doc.unites?.map((u: any) => u.nom) 
    });
    return res.status(200).json({ report });
  } catch (e: any) {
    return res.status(500).json({ error: "AUDIT_ERROR", message: e?.message });
  }
};

/* ============================
 * Helpers
 * ============================ */
const getReqUserId = (req: AuthRequest) => req.user?.id!;
const getReqOrgId = (req: AuthRequest) => req.user?.orgId!;

/* ============================
 * POST /api/duer/ia-suggest
 * ============================ */
export const suggestRisks = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};
    const unites: string[] = [
      ...(Array.isArray(body.unites) ? body.unites : []),
      ...(Array.isArray(body.units) ? body.units : [])
    ].filter(Boolean);

    const sector = (body.sector || "").trim();
    if (!sector || unites.length === 0) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "sector et unites (au moins 1) sont requis"
      });
    }

    const suggestions = await suggestService.suggest({
      sector,
      units: unites,
      historique: Array.isArray(body.historique) ? body.historique : [],
      contraintes: Array.isArray(body.contraintes) ? body.contraintes : [],
      reponses: body.reponses || {}
    });

    return res.status(200).json({ suggestions });
  } catch (e: any) {
    console.error('Error in suggestRisks:', e);
    return res.status(500).json({ 
      error: "SERVER_ERROR", 
      message: e?.message || "Une erreur est survenue lors de la génération des suggestions"
    });
  }
};

/* ============================
 * POST /api/duer/ia-questions-dynamic
 * ============================ */
export const generateQuestionsDynamic = async (req: AuthRequest, res: Response) => {
  try {
    const { sector, size, unites, historique, contraintes } = req.body as any;
    if (!sector || !size || !Array.isArray(unites) || !unites.length) {
      return res.status(400).json({ error: "Secteur, taille et unités requis" });
    }
    const out = await dynamicService.generateDynamicQuestions({
      sector, size, unites,
      historique: Array.isArray(historique) ? historique : [],
      contraintes: Array.isArray(contraintes) ? contraintes : []
    });
    return res.status(200).json(out);
  } catch (e: any) {
    return res.status(500).json({ error: "Erreur génération questions dynamiques", message: e?.message });
  }
};
/* ============================
 * POST /api/duer/ia-questions-next
 * ============================ */
export const nextQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as SlotNextInput;
    if (!body?.sector || !body?.size || !Array.isArray(body?.unites) || !body.unites.length) {
      return res.status(400).json({ error: "INVALID_INPUT", message: "sector, size, unites requis" });
    }
    const svc = new SlotFillingService(new DefaultAIProvider());
    const out = await svc.next(body);
    return res.status(200).json(out);
  } catch (e: any) {
    return res.status(500).json({ error: "SERVER_ERROR", message: e?.message || String(e) });
  }
};

/* ============================
 * POST /api/duer/ia-questions
 * ============================ */
export const generateQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { sector, size } = req.body as { sector: string; size: "TPE" | "PME" | "ETI" };
    if (!sector || !size) return res.status(400).json({ error: "Secteur et taille requis" });
    const questions = await engine.generateQuestions(sector, size);
    return res.status(200).json({ questions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return res.status(500).json({ error: "Erreur génération questions", message: msg });
  }
};

/* ============================
 * POST /api/duer/ia-generate
 * ============================ */
export const generateDUER = async (req: AuthRequest, res: Response) => {
  const t0 = Date.now();
  const reqId = `duer-${Math.random().toString(36).slice(2,8)}`;
  
  try {
    console.log(`[${reqId}] /ia-generate start`);
    
    // Extend request/response timeouts
    try {
      (req as any).setTimeout?.(120000);
      (res as any).setTimeout?.(120000);
    } catch {}
    
    const { sector, size, unites, historique, contraintes, reponses, orgCode } = req.body as {
      sector: string;
      size: "TPE" | "PME" | "ETI";
      unites: string[];
      historique?: string;
      contraintes?: string;
      reponses?: Record<string, any>;
      orgCode?: string;
    };
    
    if (!sector || !size || !Array.isArray(unites) || !unites.length) {
      return res.status(400).json({ 
        error: "INVALID_INPUT", 
        message: "Données insuffisantes. Secteur, taille et unités requis." 
      });
    }

    // Generate DUER document
    const docRaw = await engine.generateDUER({ sector, size, unites, historique, contraintes, reponses });
    
    // Sanitize and validate the document
    let doc;
    try {
      // 1) Sanitize the AI-generated content
      const sanitized = sanitizeDuerCandidate(docRaw);
      
      // 2) Enhance with organizational risks
      let enhanced = enhanceWithOrgRisks(reponses || {}, sanitized, { 
        budgetSerre: !!req.body?.budgetSerre 
      });
      
      // 3) Apply additional enhancements
      enhanced = filterRisksInScope(enhanced);
      enhanced = applyAnswersToDoc(reponses || {}, enhanced);
      enhanced = recomputePriorities(enhanced, Number(req.body?.weightProb) || 1, Number(req.body?.weightGrav) || 1);
      enhanced = smartifyMeasures(enhanced);

      
      // 4) Normalize and validate
      doc = enforceConformiteSynthese(normalizeDuerDoc(enhanced));
      console.log(`[${reqId}] Document enhanced, sanitized and validated successfully`);
    } catch (e: any) {
      console.warn(`[${reqId}] Document validation failed`, e?.issues?.slice(0, 5) || e);
      return res.status(502).json({
        error: "DUER_INVALID",
        message: "Le document généré ne respecte pas le schéma DUER.",
        issues: e?.issues?.slice(0, 8) || [String(e?.message || e)]
      });
    }
    
    // Calculate and set budget if not present
    try {
      const calc = computeBudgetFromDoc(doc);
      if (!doc?.synthese?.budget_prevention_estime || doc.synthese.budget_prevention_estime === "—") {
        doc.synthese.budget_prevention_estime = calc;
      }
    } catch (e) {
      console.warn(`[${reqId}] Budget calculation failed`, String(e));
      // Non-blocking error
    }

    // Save to database
    const created = await DuerRepo.create({
      orgId: getReqOrgId(req),
      ownerId: getReqUserId(req),
      sector,
      sizeClass: size as SizeClass,
      doc,
    });

    console.log(`[${reqId}] /ia-generate ok in ${Date.now()-t0}ms`);
    return res.status(200).json({ success: true, duerId: created.id, duer: { duer: doc } });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const isTimeout = /timeout|ETIMEDOUT|ECONNABORTED/i.test(msg);
    const upstreamStatus = e?.response?.status;
    const upstreamData = e?.response?.data;
    
    console.error(`[${reqId}] /ia-generate error`, { 
      msg, 
      upstreamStatus, 
      took: Date.now()-t0,
      stack: e?.stack
    });

    const status = isTimeout ? 504 : (upstreamStatus ? 502 : 500);
    return res.status(status).json({
      error: isTimeout ? "UPSTREAM_TIMEOUT" : (upstreamStatus ? "UPSTREAM_ERROR" : "SERVER_ERROR"),
      message: msg,
      upstreamStatus,
      upstreamData: process.env.DUER_DEBUG === '1' ? upstreamData : undefined
    });
  }
};

/* ============================
 * GET /api/duer/:id
 * ============================ */
export const getDUER = async (req: AuthRequest, res: Response) => {
  const row = await DuerRepo.getOne(req.params.id);
  if (!row || row.orgId !== getReqOrgId(req)) return res.status(404).json({ error: "DUER non trouvé" });
  const doc = enforceConformiteSynthese(normalizeDuerDoc(row.doc));
  try {
    const calc = computeBudgetFromDoc(doc);
    if (!doc?.synthese?.budget_prevention_estime || doc.synthese.budget_prevention_estime === "—") {
      doc.synthese.budget_prevention_estime = calc;
    }
  } catch { /* non bloquant */ }
  return res.status(200).json({ id: row.id, orgId: row.orgId, ownerId: row.ownerId, duer: { duer: doc } });
};

/* ============================
 * GET /api/duer
 * ============================ */
export const listDUERs = async (req: AuthRequest, res: Response) => {
  const items = await DuerRepo.listByOrg(getReqOrgId(req));
  return res.status(200).json({ items });
};

/* ============================
 * DELETE /api/duer/:id
 * ============================ */
export const deleteDUER = async (req: AuthRequest, res: Response) => {
  const row = await DuerRepo.getOne(req.params.id);
  if (!row || row.orgId !== getReqOrgId(req)) return res.status(404).json({ error: "DUER non trouvé" });
  const isOwnerOrAdmin = row.ownerId === getReqUserId(req) || req.user?.role === "ADMIN";
  if (!isOwnerOrAdmin) return res.status(403).json({ error: "Accès refusé" });
  await prisma.duer.delete({ where: { id: req.params.id } });
  return res.status(200).json({ success: true });
};

/* ============================
 * POST /api/duer/ia-explain
 * ============================ */
export const explainRisk = async (req: Request, res: Response) => {
  try {
    const body = (req.body as any) ?? {};
    const r = body.risque ?? body ?? {};
    if (!r?.danger) return res.status(400).json({ error: "Données du risque requises (danger manquant)" });

    const prompt = prompts.getExplanationPrompt(r);
    const out = await new MistralProvider().chatJSON<{
      explication?: {
        resume_simple: string;
        statistiques?: string;
        exemple_accident?: string;
        reference_principale?: string;
        conseil_pratique?: string;
      };
    }>(prompt, "Tu réponds en JSON strict.");

    if (!out?.explication?.resume_simple) {
      return res.status(422).json({ error: "Réponse IA non valide", raw: out });
    }
    return res.status(200).json(out.explication);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return res.status(500).json({ error: "Erreur lors de l'explication du risque", message: msg });
  }
};

/* ============================
 * GET /api/duer/:id/pdf
 * ============================ */
export const generateDUERPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await DuerRepo.getOne(id);
    if (!row) return res.status(404).json({ error: "DUER non trouvé" });

    const doc = normalizeDuerDoc(row.doc);
    const pdfDoc = renderDuerPdf(id, doc, { title: "Document Unique d'Évaluation des Risques" });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=DUER_${id}.pdf`);
    // PDFKit -> stream
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (e: any) {
    console.error("PDF generation error:", e);
    return res.status(500).json({ error: "Erreur lors de la génération du PDF", details: e?.message });
  }
};

/* ============================
 * GET /api/duer/:id/flat
 * ============================ */
export const getDUERFlat = async (req: AuthRequest, res: Response) => {
  const row = await DuerRepo.getOne(req.params.id);
  if (!row || row.orgId !== req.user!.orgId) return res.status(404).json({ error: "DUER non trouvé" });
  const doc = enforceConformiteSynthese(normalizeDuerDoc(row.doc));
  const rows = flattenDuer(doc);
  return res.status(200).json({ rows });
};

/* ============================
 * GET /api/duer/:id/csv
 * ============================ */
export const exportDUERCsv = async (req: AuthRequest, res: Response) => {
  const row = await DuerRepo.getOne(req.params.id);
  if (!row || row.orgId !== req.user!.orgId) return res.status(404).json({ error: "DUER non trouvé" });

  const doc = normalizeDuerDoc(row.doc);
  const rows = flattenDuer(doc);

  // CSV (sans dépendance)
  const header = [
    "unitId","unitName","riskId","applicable",
    "danger","situation",
    "gravite","grav_label","probabilite","prob_label","hierarchie",
    "priorite_brut","maitrise","risque_net",
    "effectifs_concernes","penibilite",
    "mesures_existantes","mesures_proposees",
    "suivi_responsable","suivi_echeance","suivi_indicateur","suivi_date_decision","suivi_realise_le"
  ];
  
  const escape = (v: any) => {
    const s = typeof v === "string" ? v : JSON.stringify(v ?? "");
    // remplacer CR/LF et guillemets
    const cleaned = s.replace(/\r?\n/g, " ").replace(/"/g, '""');
    return `"${cleaned}"`;
  };

  const lines = rows.map(r => {
    const probL = probToLabel(Number(r.probabilite));
    const gravL = gravToLabel(Number(r.gravite));
    const h = calculerHierarchie(probL, gravL);
    return [
      r.unitId, r.unitName, r.riskId, r.applicable ? "oui" : "non",
      r.danger, r.situation,
      r.gravite, gravL, r.probabilite, probL, h,
      r.priorite, r.maitrise || "", r.risque_net || r.priorite,
      r.effectifs_concernes ?? "", r.penibilite === null ? "" : (r.penibilite ? "oui" : "non"),
      (r.mesures_existantes || []).join(" • "),
      (r.mesures_proposees || []).map((m: any) => m?.description).filter(Boolean).join(" • "),
      r.suivi?.responsable || "",
      r.suivi?.echeance || "",
      r.suivi?.indicateur || "",
      r.suivi?.date_decision || "",
      r.suivi?.realise_le || ""
    ].map(escape).join(",");
  });

  const csv = [header.join(","), ...lines].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="DUER_${row.id}.csv"`);
  return res.status(200).send("\uFEFF" + csv); // BOM pour Excel
};

type PatchOp =
  | { op: 'edit_risk'; unitId: string; riskId: string; data: Partial<{
      danger: string; situation: string; gravite: number; probabilite: number; priorite: number;
      mesures_existantes: string[]; mesures_proposees: Array<any>; suivi: any;
    }>; }
  | { op: 'add_risk'; unitId: string; risk: any }
  | { op: 'remove_risk'; unitId: string; riskId: string }
  | { op: 'add_unit'; unit: { id?: string; nom: string; risques: any[] } }
  | { op: 'edit_unit'; unitId: string; data: Partial<{ nom: string }> }
  | { op: 'remove_unit'; unitId: string }
  | { op: 'edit_maitrise'; unitId: string; riskId: string; maitrise: "AUCUNE"|"PARTIELLE"|"BONNE"|"TRES_BONNE" }
  | { op: 'edit_effectifs'; unitId: string; riskId: string; effectifs: number|null }
  | { op: 'toggle_penibilite'; unitId: string; riskId: string; value: boolean|null }
  | { op: 'set_dates'; unitId: string; riskId: string; date_decision?: string; realise_le?: string };

export const patchDUER = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const ops = (req.body?.ops || []) as PatchOp[];
  if (!Array.isArray(ops) || ops.length === 0) {
    return res.status(400).json({ error: "ops array required" });
  }

  // sécurité: charger + vérifier propriétaire/org
  const row = await DuerRepo.getOne(id);
  if (!row || row.orgId !== req.user!.orgId) return res.status(404).json({ error: "DUER non trouvé" });

  let doc = normalizeDuerDoc(row.doc);

  // helpers
  const findUnit = (unitId: string) => doc.unites.find(u => (u as any).id === unitId || u.nom === unitId);
  const findRisk = (unit: any, riskId: string) => unit?.risques.find((r: any) => r.id === riskId);

  // applique les ops
  for (const op of ops) {
    switch (op.op) {
      case 'edit_risk': {
        const u = findUnit(op.unitId);
        const r = u && findRisk(u, op.riskId);
        if (!u || !r) continue;
        Object.assign(r, op.data || {});
        // recalcul priorite si gravite/probabilite changent
        if (op.data?.gravite || op.data?.probabilite) {
          const g = Number(r.gravite) || 1;
          const p = Number(r.probabilite) || 1;
          r.priorite = Number(g * p);
        }
        break;
      }
      case 'add_risk': {
        const u = findUnit(op.unitId);
        if (!u) continue;
        const newRisk = { ...op.risk };
        if (!newRisk.id) {
          newRisk.id = `R${Date.now().toString(36).slice(2,6)}-${Math.random().toString(36).slice(2,6)}`;
        }
        u.risques.push(newRisk);
        break;
      }
      case 'remove_risk': {
        const u = findUnit(op.unitId);
        if (!u) continue;
        u.risques = u.risques.filter((r: any) => r.id !== op.riskId);
        break;
      }
      case 'add_unit': {
        const unit = { ...op.unit, risques: op.unit.risques || [] };
        (unit as any).id = (unit as any).id || `U${Date.now().toString(36).slice(2,6)}-${Math.random().toString(36).slice(2,6)}`;
        doc.unites.push(unit as any);
        break;
      }
      case 'edit_unit': {
        const u = findUnit(op.unitId);
        if (!u) continue;
        Object.assign(u, op.data || {});
        break;
      }
      case 'remove_unit': {
        doc.unites = doc.unites?.filter((u: any) => (u as any).id !== op.unitId) || [];
        break;
      }
      case 'edit_maitrise': {
        const u = findUnit(op.unitId); const r = u && findRisk(u, op.riskId); if (!r) break;
        const maitrise = op.maitrise as 'AUCUNE' | 'PARTIELLE' | 'BONNE' | 'TRES_BONNE';
        r.maitrise = maitrise;
        const g = Number(r.gravite) || 1;
        const p = Number(r.probabilite) || 1;
        const maitriseFactors = { AUCUNE: 0, PARTIELLE: 0.5, BONNE: 0.7, TRES_BONNE: 0.9 };
        const f = (maitriseFactors as any)[maitrise] ?? 0;
        r.risque_net = Math.ceil(g * p * (1 - f));
        break;
      }
      case 'edit_effectifs': {
        const u = findUnit(op.unitId); const r = u && findRisk(u, op.riskId); if (!r) break;
        r.effectifs_concernes = op.effectifs;
        break;
      }
      case 'toggle_penibilite': {
        const u = findUnit(op.unitId); const r = u && findRisk(u, op.riskId); if (!r) break;
        r.penibilite = op.value;
        break;
      }
      case 'set_dates': {
        const u = findUnit(op.unitId); const r = u && findRisk(u, op.riskId); if (!r) break;
        r.suivi = { ...(r.suivi||{}),
          date_decision: op.date_decision ?? r.suivi?.date_decision,
          realise_le: op.realise_le ?? r.suivi?.realise_le
        };
        break;
      }
      default:
        // ignore op inconnue
        break;
    }
  }

  // re-valider + normaliser
  try {
    const valid = DuerSchema.parse(doc);
    const normalized = normalizeDuerDoc(valid);
    await DuerRepo.update(id, normalized);
    return res.status(200).json({ success: true, duer: { duer: normalized } });
  } catch (e: any) {
    return res.status(422).json({ error: "Validation DUER", details: e?.issues || e?.message });
  }
};
