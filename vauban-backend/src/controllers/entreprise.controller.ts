import { encrypt, decrypt } from "../utils/crypto";
import { Entreprise, SensitiveField } from "../models/Entreprise";
import { Request, Response } from 'express';

// Remplace ce mock par ta BDD réelle
let entrepriseData: Entreprise | null = null;

function encryptFields(obj: any, key: string) {
  Object.keys(obj).forEach((field) => {
    if (obj[field]?.isSensitive) {
      obj[field].value = encrypt(obj[field].value, key);
    }
  });
}

export const saveEntreprise = (req: Request, res: Response) => {
  const { data, key } = req.body;
  encryptFields(data, key);
  entrepriseData = data;
  res.json({ status: "ok" });
};

function pseudoName(index: number): string {
  const pseudos = ["Napoléon", "Clemenceau", "De Gaulle", "Jaurès"];
  return pseudos[index % pseudos.length];
}

export const getEntreprise = (req: Request, res: Response) => {
  const { mode } = req.query;
  let data = entrepriseData;
  if (!data) return res.status(404).json({ error: "Not found" });

  if (mode === "online") {
    Object.keys(data).forEach((field, i) => {
      const typedField = field as keyof Entreprise;
      const fieldValue = data[typedField];
      if (typeof fieldValue === 'object' && 'isSensitive' in fieldValue) {
        if (
          field === "nom" ||
          field === "prenom" ||
          field === "email" ||
          field === "telephone"
        ) {
          (fieldValue as SensitiveField).value = pseudoName(i);
        } else {
          (fieldValue as SensitiveField).value = "******";
        }
      }
    });
    return res.json(data);
  }
  res.json(data);
};
