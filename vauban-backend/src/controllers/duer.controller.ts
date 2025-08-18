import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { DuerSchema, DuerDoc } from "../schemas/duer.schema";
import { DuerEngine } from "../services/duer.engine";
import { normalizeDuerDoc, flattenDuer } from "../services/duer-normalize.service";
import { MistralProvider } from "../services/mistral.provider";
import { DuerRepo } from "../repositories/duer.repo";
import { renderDuerPdf } from "../services/pdf.service";
import { DUERPromptsService } from "../services/duer-prompts.service"; // pour ia-explain
import { SizeClass } from ".prisma/client";
import { prisma } from "../services/prisma";
import { encryptJson, decryptJson } from "../services/crypto.service";

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

/* ============================
 * Helpers
 * ============================ */
const getReqUserId = (req: AuthRequest) => req.user?.id!;
const getReqOrgId = (req: AuthRequest) => req.user?.orgId!;

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
  try {
    const { sector, size, unites, historique, contraintes, reponses, orgCode } = req.body as {
      sector: string;
      size: "TPE" | "PME" | "ETI";
      unites: string[];
      historique?: string;
      contraintes?: string;
      reponses?: Record<string, any>;
      orgCode?: string;
    };
    if (!sector || !size || !Array.isArray(unites) || !unites.length)
      return res.status(400).json({ error: "Données insuffisantes. Secteur, taille et unités requis." });

    const docRaw = await engine.generateDUER({ sector, size, unites, historique, contraintes, reponses });
    // validation et normalisation
    const doc = normalizeDuerDoc(DuerSchema.parse(docRaw));

    const created = await DuerRepo.create({
      orgId: getReqOrgId(req),
      ownerId: getReqUserId(req),
      sector,
      sizeClass: size as SizeClass,
      doc,
    });

    return res.status(200).json({ success: true, duerId: created.id, duer: { duer: doc } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return res.status(500).json({ error: "Erreur lors de la génération du DUER", message: msg });
  }
};

/* ============================
 * GET /api/duer/:id
 * ============================ */
export const getDUER = async (req: AuthRequest, res: Response) => {
  const row = await DuerRepo.getOne(req.params.id);
  if (!row || row.orgId !== getReqOrgId(req)) return res.status(404).json({ error: "DUER non trouvé" });
  return res.status(200).json({ id: row.id, orgId: row.orgId, ownerId: row.ownerId, duer: { duer: row.doc } });
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
    const pdf = await renderDuerPdf(id, doc, { title: "Document Unique d'Évaluation des Risques" });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=DUER_${id}.pdf`);
    return res.send(pdf);
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

  const doc = normalizeDuerDoc(row.doc);
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
    "unitId","unitName","riskId","danger","situation",
    "gravite","probabilite","priorite",
    "mesures_existantes","mesures_proposees","suivi_responsable","suivi_echeance","suivi_indicateur"
  ];
  
  const escape = (v: any) => {
    const s = typeof v === "string" ? v : JSON.stringify(v ?? "");
    // remplacer CR/LF et guillemets
    const cleaned = s.replace(/\r?\n/g, " ").replace(/"/g, '""');
    return `"${cleaned}"`;
  };

  const lines = rows.map(r => [
    r.unitId, r.unitName, r.riskId, r.danger, r.situation,
    r.gravite, r.probabilite, r.priorite,
    (r.mesures_existantes || []).join(" • "),
    (r.mesures_proposees || []).map((m: any) => m?.description).filter(Boolean).join(" • "),
    r.suivi?.responsable || "",
    r.suivi?.echeance || "",
    r.suivi?.indicateur || ""
  ].map(escape).join(","));

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
  | { op: 'remove_unit'; unitId: string };

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
          newRisk.id = `R${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
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
        (unit as any).id = (unit as any).id || `U${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
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
        doc.unites = doc.unites.filter(u => (u as any).id !== op.unitId && u.nom !== op.unitId);
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
