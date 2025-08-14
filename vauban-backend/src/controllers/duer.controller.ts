import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { DuerSchema, DuerDoc } from "../schemas/duer.schema";
import { DuerEngine } from "../services/duer.engine";
import { MistralProvider } from "../services/mistral.provider";
import { DuerRepo } from "../repositories/duer.repo";
import { renderDuerPdf } from "../services/pdf.service";
import { DUERPromptsService } from "../services/duer-prompts.service"; // pour ia-explain
import { SizeClass } from ".prisma/client";
import { prisma } from "../services/prisma";

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

    const doc = await engine.generateDUER({ sector, size, unites, historique, contraintes, reponses });
    // validation défensive
    DuerSchema.parse(doc);

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
    const row = await DuerRepo.getOne(req.params.id);
    if (!row) return res.status(404).json({ error: "DUER non trouvé" });

    const docData: DuerDoc = row.doc;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="DUER_${row.id}.pdf"`);

    const doc = renderDuerPdf(row.id, docData, { title: "Document Unique d'Évaluation des Risques (DUER)" });
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error("Erreur génération PDF:", error);
    return res.status(500).json({ error: "Erreur lors de la génération du PDF" });
  }
};
