// File: vauban-backend/src/controllers/crisis.controller.ts
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { CrisisPromptsService } from '../services/crisis-prompts.service';
import { MistralService }       from '../services/mistral.service';

const prompts = new CrisisPromptsService();
const mistral = new MistralService();

/**
 * Lit et renvoie un template JSON de crise statique.
 * URL attendue : GET /api/crisis/template/:type
 */
export const getCrisisTemplate = (req: Request, res: Response): void => {
    const { type } = req.params;
    const filePath = path.join(__dirname, '../assets/templates/crisis', `${type}.json`);
  
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`Template not found: ${filePath}`, err);
        return res.status(404).json({ error: 'Template not found' });
      }
      try {
        const json = JSON.parse(data);
        return res.json(json);
      } catch (parseErr) {
        console.error(`Invalid JSON for template ${filePath}`, parseErr);
        return res.status(500).json({ error: 'Invalid template format' });
      }
    });
};


/**
 * POST /api/crisis/analyze
 * Body : { type: 'incendie', size: number, sector: string }
 */
export const analyzeSituation = async (req: Request, res: Response) => {
    const { type, size, sector } = req.body;
    if (type !== 'incendie') {
      return res.status(400).json({ error: 'Seul "incendie" est supporté.' });
    }
  
    try {
      const prompt = prompts.getIncendiePrompt({ size, sector });
      const aiText = await mistral.sendPrompt(prompt);
  
      let aiJson;
      try {
        aiJson = JSON.parse(aiText);
      } catch (parseErr) {
        console.error('Invalid JSON from Mistral:', aiText);
        return res
          .status(502)
          .json({ error: 'Réponse IA invalide', raw: aiText });
      }
  
      return res.json(aiJson);
  
    } catch (err) {
      console.error('analyseSituation error:', err);
      return res.status(500).json({ error: 'Échec de l’analyse IA' });
    }
};