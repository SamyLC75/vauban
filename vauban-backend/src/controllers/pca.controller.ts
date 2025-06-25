import { Request, Response } from "express";
import { PCAPlan } from "../models/PCA";
import { encrypt, decrypt } from "../utils/crypto";

let pcaData: PCAPlan | null = null;

export const savePCA = (req: Request, res: Response) => {
  const { data, key } = req.body;
  // TODO: Ajoute le chiffrement si besoin sur les champs sensibles
  pcaData = data;
  res.json({ status: "ok" });
};

export const getPCA = (req: Request, res: Response) => {
  if (!pcaData) return res.status(404).json({ error: "Not found" });
  res.json(pcaData);
};
