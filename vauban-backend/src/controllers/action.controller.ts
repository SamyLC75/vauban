import { Request, Response } from "express";
import { PreventionAction } from "../models/Action";
import { encrypt, decrypt } from "../utils/crypto";

let actionsData: PreventionAction[] = [];

export const saveActions = (req: Request, res: Response) => {
  const { data, key } = req.body;
  // TODO: Chiffrement si besoin
  actionsData = data;
  res.json({ status: "ok" });
};

export const getActions = (req: Request, res: Response) => {
  res.json(actionsData);
};
