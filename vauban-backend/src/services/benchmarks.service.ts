// src/services/benchmarks.service.ts
// Valeurs initiales (à affiner) pour guider pondérations & budgets.
// Idée: ces stats sont injectées dans les prompts et utilisées côté UI.
export const SizeBenchmarks = {
  TPE: { avgBudget: "1k–5k€", weightProb: 1.0, weightGrav: 1.1, topRisks: ["Chute de plain-pied","TMS","Incendie débutant"] },
  PME: { avgBudget: "5k–25k€", weightProb: 1.1, weightGrav: 1.15, topRisks: ["TMS manutention","Chimique léger","RPS"] },
  ETI: { avgBudget: "25k–250k€", weightProb: 1.2, weightGrav: 1.2, topRisks: ["Chimique/Process","Machine","AT graves"] },
};
