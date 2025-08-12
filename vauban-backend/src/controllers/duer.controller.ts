// vauban-backend/src/controllers/duer.controller.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DUERPromptsService } from '../services/duer-prompts.service';
import { MistralService } from '../services/mistral.service';
import PDFDocument from 'pdfkit';

const duerPrompts = new DUERPromptsService();
const mistral = new MistralService();

// ---- Types internes minimalistes
type DUERRecord = {
  id: string;
  ownerId: string;              // propriétaire canonique (JWT user id)
  dateCreation: string;
  dateModification?: string;
  orgCode?: string;
  duer: any;                    // document DUER (JSON)
  // compat héritée (lecture seule potentielle)
  ownerUserId?: string;
  userId?: string;
  createdBy?: string;
};

// ---- Stockage en mémoire (remplacer par DB plus tard)
const duerStorage = new Map<string, DUERRecord>();

// ---- Helpers
const getReqUserId = (req: AuthRequest) => req.user?.id || req.userId;
const genDUERId = () => `DUER-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
const resolveOwner = (rec: DUERRecord) =>
  rec.ownerId ?? rec.ownerUserId ?? rec.userId ?? rec.createdBy;

/* =========================================
 *  POST /api/duer/ia-questions
 * ========================================= */
export const generateQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { sector, size } = req.body;
    if (!sector || !size) return res.status(400).json({ error: 'Secteur et taille requis' });

    const prompt = duerPrompts.getQuestionsPrompt(sector, size);
    const response = await mistral.sendPrompt(prompt);

    try {
      const json = JSON.parse(response);
      return res.json(json);
    } catch {
      // Fallback questions par défaut
      return res.json({
        questions: [
          {
            id: 'Q1',
            question: 'Votre entreprise manipule-t-elle des charges lourdes (>10kg) régulièrement ?',
            type: 'oui_non',
            justification: 'Évaluer les risques de TMS et manutention',
            impact: 'Ajout de risques liés au port de charges',
          },
          {
            id: 'Q2',
            question: 'Y a-t-il du travail en hauteur (>2m) ?',
            type: 'oui_non',
            justification: 'Risque de chute grave',
            impact: 'Mesures anti-chute obligatoires',
          },
          {
            id: 'Q3',
            question: 'Quels types de produits chimiques utilisez-vous ?',
            type: 'texte',
            justification: 'Évaluation risque chimique',
            impact: 'FDS et mesures de protection spécifiques',
          },
        ],
      });
    }
  } catch (error) {
    console.error('Erreur génération questions:', error);
    return res.status(500).json({
      error: 'Erreur génération questions',
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    });
  }
};

/* =========================================
 *  POST /api/duer/ia-generate
 * ========================================= */
export const generateDUER = async (req: AuthRequest, res: Response) => {
  try {
    const { sector, size, unites, historique, contraintes, reponses } = req.body;
    if (!sector || !size || !Array.isArray(unites) || unites.length === 0) {
      return res.status(400).json({ error: 'Données insuffisantes. Secteur, taille et unités requis.' });
    }

    const filledUnits: string[] = unites.map((u: any) => String(u).trim()).filter(Boolean);
    const context: any = { sector, size, unites: filledUnits, historique, contraintes };
    if (reponses) context.contraintes = `${contraintes || ''} ${JSON.stringify(reponses)}`;

    const prompt = duerPrompts.getDUERGenerationPrompt(context);
    const response = await mistral.sendPrompt(prompt);

    try {
      let jsonResponse = response.trim();
      if (jsonResponse.startsWith('```')) {
        jsonResponse = jsonResponse.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      }
      const m = jsonResponse.match(/\{[\s\S]*\}/);
      if (m) jsonResponse = m[0];

      const parsed = JSON.parse(jsonResponse);
      const doc = parsed.duer ?? parsed;
      if (!doc || !doc.unites) throw new Error('Structure DUER invalide (pas de .unites)');

      const duerId = genDUERId();
      const record: DUERRecord = {
        id: duerId,
        ownerId: getReqUserId(req) || 'unknown',
        dateCreation: new Date().toISOString(),
        orgCode: req.body.orgCode || 'DEMO',
        duer: doc,
      };
      duerStorage.set(duerId, record);

      return res.json({
        success: true,
        duerId,
        duer: { duer: record.duer },
        debug: {
          modelUsed: 'mistral-tiny',
          promptLength: prompt.length,
          responseLength: response.length,
        },
      });
    } catch (parseError) {
      // Rejet IA explicite
      if (response.includes('Je ne peux pas') || response.includes('désolé')) {
        return res.status(400).json({
          error: "L'IA a refusé de générer le DUER",
          message: response,
          suggestion: 'Essayez avec un secteur plus spécifique',
        });
      }

      // Fallback minimal persisté
      const minimal = generateMinimalDUER(sector, size, filledUnits);
      const duerId = `DUER-MINIMAL-${Date.now()}`;
      const record: DUERRecord = {
        id: duerId,
        ownerId: getReqUserId(req) || 'unknown',
        dateCreation: new Date().toISOString(),
        orgCode: req.body.orgCode || 'DEMO',
        duer: minimal.duer ?? minimal,
      };
      duerStorage.set(duerId, record);

      return res.json({
        success: true,
        duerId,
        duer: { duer: record.duer },
        warning: 'DUER généré en mode dégradé (erreur parsing IA)',
        debug: {
          modelUsed: 'mistral-tiny',
          promptLength: (prompt || '').length,
          responseLength: (response || '').length,
        },
      });
    }
  } catch (error) {
    console.error('Erreur génération DUER:', error);
    return res.status(500).json({
      error: 'Erreur lors de la génération du DUER',
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      suggestion: 'Vérifiez la configuration Mistral AI',
    });
  }
};

/* =========================================
 *  GET /api/duer/:id
 * ========================================= */
export const getDUER = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const saved = duerStorage.get(id);
  if (!saved) return res.status(404).json({ error: 'DUER non trouvé' });

  const reqUserId = getReqUserId(req);
  const owner = resolveOwner(saved);

  if (owner && reqUserId && owner !== reqUserId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // migration douce si owner absent
  if (!owner && reqUserId) {
    saved.ownerId = reqUserId;
    saved.dateModification = new Date().toISOString();
    duerStorage.set(id, saved);
  }

  return res.json(saved);
};

/* =========================================
 *  POST /api/duer/ia-explain
 * ========================================= */
export const explainRisk = async (req: Request, res: Response) => {
  try {
    const r = (req.body?.risque ?? req.body) || {};
    const { danger, situation, gravite, probabilite } = r;
    if (!danger) return res.status(400).json({ error: 'Données du risque requises (danger manquant)' });

    const prompt = duerPrompts.getExplanationPrompt({ danger, situation, gravite, probabilite });
    const response = await mistral.sendPrompt(prompt);

    try {
      const parsed = JSON.parse(response);
      const flat = parsed?.explication && typeof parsed.explication === 'object' ? parsed.explication : parsed;
      if (flat && flat.resume_simple) return res.json(flat);
    } catch { /* noop */ }

    // Fallback
    return res.json({
      resume_simple: `Le risque "${danger}" nécessite une attention particulière dans votre secteur.`,
      statistiques: 'Données statistiques non disponibles',
      exemple_accident: "Consultez les retours d'expérience de votre branche",
      reference_principale: 'Code du travail Art. R4121-1 et suivants',
      conseil_pratique: 'Effectuez une analyse de risque détaillée avec vos équipes',
    });
  } catch (error) {
    console.error('Erreur explication risque:', error);
    return res.status(500).json({ error: "Erreur lors de l'explication du risque" });
  }
};

/* =========================================
 *  PUT /api/duer/:id/update
 * ========================================= */
export const updateDUER = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { changement } = req.body;

    const current = duerStorage.get(id);
    if (!current) return res.status(404).json({ error: 'DUER non trouvé' });

    const reqUserId = getReqUserId(req);
    const owner = resolveOwner(current);
    if (owner && reqUserId && owner !== reqUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const prompt = duerPrompts.getUpdatePrompt(current.duer, changement);
    const response = await mistral.sendPrompt(prompt);

    let modifications: any;
    try {
      modifications = JSON.parse(response);
    } catch {
      return res.status(500).json({ error: 'Réponse IA non valide', message: response });
    }

    // fusion simple au niveau du document DUER
    const updatedDoc = {
      ...(current.duer || {}),
      ...(modifications.duer || modifications),
    };

    // historique
    const hist = Array.isArray(updatedDoc.historique) ? updatedDoc.historique : [];
    updatedDoc.historique = [
      ...hist,
      { date: new Date().toISOString(), type: changement?.type, description: changement?.details },
    ];

    const updated: DUERRecord = {
      ...current,
      duer: updatedDoc,
      dateModification: new Date().toISOString(),
    };
    duerStorage.set(id, updated);

    return res.json({ success: true, duer: updated.duer });
  } catch (error) {
    console.error('Erreur mise à jour DUER:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du DUER' });
  }
};

/* =========================================
 *  POST /api/duer/ia-measures
 * ========================================= */
export const generateInnovativeMeasures = async (req: Request, res: Response) => {
  try {
    const { risque, budget } = req.body;
    if (!risque || !risque.danger) return res.status(400).json({ error: 'Données du risque requises' });

    const prompt = duerPrompts.getMesuresInnovantesPrompt(risque, budget || '€€');
    const response = await mistral.sendPrompt(prompt);

    try {
      const parsed = JSON.parse(response);
      return res.json(parsed);
    } catch {
      return res.status(500).json({ error: 'Réponse IA non valide', message: response });
    }
  } catch (error) {
    console.error('Erreur génération mesures:', error);
    return res.status(500).json({ error: 'Erreur lors de la génération des mesures' });
  }
};

/* =========================================
 *  GET /api/duer         (liste courte pour Dashboard)
 *  DELETE /api/duer/:id
 * ========================================= */
export const listDUERs = async (req: AuthRequest, res: Response) => {
  const uid = getReqUserId(req);
  const isAdmin = req.role === 'admin';

  const items = [...duerStorage.values()].filter(r => (isAdmin ? true : resolveOwner(r) === uid));
  const view = items
    .sort((a, b) => (a.dateCreation < b.dateCreation ? 1 : -1))
    .map(r => {
      const d = r.duer?.duer ? r.duer.duer : r.duer;
      return {
        id: r.id,
        ownerId: resolveOwner(r),
        dateCreation: r.dateCreation,
        secteur: d?.secteur || '—',
        date_generation: d?.date_generation || r.dateCreation,
        unitesCount: Array.isArray(d?.unites) ? d.unites.length : 0,
        crit: d?.synthese?.nb_risques_critiques ?? 0,
        imp: d?.synthese?.nb_risques_importants ?? 0,
        mod: d?.synthese?.nb_risques_moderes ?? 0,
      };
    });

  return res.json({ items: view });
};

export const deleteDUER = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const rec = duerStorage.get(id);
  if (!rec) return res.status(404).json({ error: 'DUER non trouvé' });

  const uid = getReqUserId(req);
  const isAdmin = req.role === 'admin';
  const owner = resolveOwner(rec);
  if (!isAdmin && owner && uid && owner !== uid) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  duerStorage.delete(id);
  return res.json({ success: true });
};

/* =========================================
 *  GET /api/duer/:id/pdf
 * ========================================= */
export const generateDUERPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const saved = duerStorage.get(id);
    if (!saved) return res.status(404).json({ error: 'DUER non trouvé' });

    const docData = saved.duer?.duer ?? saved.duer ?? saved;

    const secteur = docData.secteur || 'N/A';
    const dateGen = docData.date_generation || new Date().toISOString();
    const synthese = docData.synthese || {};
    const unites: Array<any> = Array.isArray(docData.unites) ? docData.unites : [];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="DUER_${id}.pdf"`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // En-tête
    doc.fontSize(18).text("Document Unique d'Évaluation des Risques (DUER)", { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Identifiant: ${id}`);
    doc.text(`Secteur: ${secteur}`);
    doc.text(`Date de génération: ${new Date(dateGen).toLocaleString('fr-FR')}`);
    doc.moveDown();

    // Synthèse
    doc.fontSize(14).text('Synthèse', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).list([
      `Risques critiques: ${synthese.nb_risques_critiques ?? '-'}`,
      `Risques importants: ${synthese.nb_risques_importants ?? '-'}`,
      `Risques modérés: ${synthese.nb_risques_moderes ?? '-'}`,
      `Budget prévention estimé: ${synthese.budget_prevention_estime ?? '-'}`,
    ]);
    if (synthese.top_3_priorites?.length) {
      doc.moveDown(0.5).text('Top priorités :');
      synthese.top_3_priorites.forEach((p: string) => doc.text(`• ${p}`));
    }
    if (synthese.conformite_reglementaire) {
      const c = synthese.conformite_reglementaire;
      if (c.points_forts?.length) {
        doc.moveDown(0.5).text('Points forts :');
        c.points_forts.forEach((p: string) => doc.text(`• ${p}`));
      }
      if (c.points_vigilance?.length) {
        doc.moveDown(0.5).text('Points de vigilance :');
        c.points_vigilance.forEach((p: string) => doc.text(`• ${p}`));
      }
    }

    // Unités & risques
    unites.forEach((u: any, idx: number) => {
      doc.addPage();
      doc.fontSize(16).text(`Unité : ${u.nom || `Unité ${idx + 1}`}`);
      const risques: Array<any> = Array.isArray(u.risques) ? u.risques : [];
      if (!risques.length) {
        doc.moveDown().fontSize(12).text('Aucun risque renseigné pour cette unité.');
        return;
      }

      risques.forEach((r: any) => {
        doc.moveDown(0.8);
        doc.fontSize(13).text(`• ${r.danger || 'Danger'}`);
        doc.fontSize(11).text(`Situation : ${r.situation ?? '-'}`);
        doc.text(`Gravité : ${r.gravite ?? '-'}  |  Probabilité : ${r.probabilite ?? '-'}  |  Priorité : ${r.priorite ?? '-'}`);

        if (Array.isArray(r.mesures_existantes) && r.mesures_existantes.length) {
          doc.text('Mesures existantes :');
          r.mesures_existantes.forEach((m: string) => doc.text(`  - ${m}`));
        }
        if (Array.isArray(r.mesures_proposees) && r.mesures_proposees.length) {
          doc.text('Mesures proposées :');
          r.mesures_proposees.forEach((m: any) =>
            doc.text(`  - ${m.description}${m.cout_estime ? ` (${m.cout_estime})` : ''}`)
          );
        }
        if (r.suivi && typeof r.suivi === 'object') {
          doc.text('Suivi :');
          if (r.suivi.responsable) doc.text(`  - Responsable : ${r.suivi.responsable}`);
          if (r.suivi.echeance) doc.text(`  - Échéance : ${r.suivi.echeance}`);
          if (r.suivi.indicateur) doc.text(`  - Indicateur : ${r.suivi.indicateur}`);
        }
      });
    });

    doc.end();
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    return res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
  }
};

// ---- DUER minimal pour fallback
function generateMinimalDUER(sector: string, size: string, unites: string[]) {
  return {
    duer: {
      secteur: sector,
      date_generation: new Date().toISOString(),
      unites: unites.map(unite => ({
        nom: unite,
        risques: [
          {
            id: 'R001',
            danger: 'Risque de chute de plain-pied',
            situation: 'Circulation dans les locaux',
            gravite: 2,
            probabilite: 3,
            priorite: 6,
            mesures_existantes: ['Sol maintenu propre'],
            mesures_proposees: [{
              type: 'collective',
              description: 'Installer un éclairage adapté',
              delai: 'court_terme',
              cout_estime: '€',
              reference: 'INRS ED 950'
            }],
            suivi: {
              responsable: 'Responsable sécurité',
              echeance: '3 mois',
              indicateur: 'Nombre de chutes'
            }
          }
        ]
      })),
      synthese: {
        nb_risques_critiques: 0,
        nb_risques_importants: 1,
        nb_risques_moderes: 0,
        top_3_priorites: ['Risque de chute'],
        budget_prevention_estime: '500-1000€',
        conformite_reglementaire: {
          points_forts: ['DUER créé'],
          points_vigilance: ['À compléter avec analyse terrain']
        }
      }
    }
  };
}
