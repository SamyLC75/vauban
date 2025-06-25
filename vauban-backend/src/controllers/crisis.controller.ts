// File: vauban-backend/src/controllers/crisis.controller.ts
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {CrisisPromptsService} from '../services/crisis-prompts.services';
/**
 * Lit et renvoie un template JSON de crise statique.
 * URL attendue : GET /api/crisis/template/:type
 */
export const getCrisisTemplate = (req: Request, res: Response): void => {
  const { type } = req.params; // ex. 'incendie'
  const templatePath = path.join(
    __dirname,
    '../assets/templates/crisis',
    `${type}.json`
  );
  const prompts = new CrisisPromptsService();

  fs.readFile(templatePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Template not found: ${templatePath}`, err);
      return res.status(404).json({ error: 'Template not found' });
    }
    try {
      const json = JSON.parse(data);
      return res.json(json);
    } catch (parseErr) {
      console.error(`Erreur format JSON: ${templatePath}`, parseErr);
      return res.status(500).json({ error: 'Invalid template format' });
    }
  });
};

