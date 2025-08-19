import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { DefaultAIProvider } from "../services/ai.provider";
import { DuerDynamicService } from "../services/duer-dynamic.service";

export class DuerDynamicController {
  static async generateQuestions(req: AuthRequest, res: Response) {
    try {
      const ai = new DefaultAIProvider();
      const svc = new DuerDynamicService(ai);
      const result = await svc.generateDynamicQuestions(req.body);
      return res.json(result);
    } catch (e: any) {
      console.error("ia-questions-dynamic:", e);
      return res.status(500).json({ error: "generation_failed", message: e?.message || "unknown" });
    }
  }
}
