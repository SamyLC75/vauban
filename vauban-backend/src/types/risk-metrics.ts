export type MaitriseNiveau = "AUCUNE" | "PARTIELLE" | "BONNE" | "TRES_BONNE";

export const MAITRISE_FACTEUR: Record<MaitriseNiveau, number> = {
  AUCUNE: 0,
  PARTIELLE: 0.5,
  BONNE: 0.7,
  TRES_BONNE: 0.9,
};

export const risqueBrut = (g: number, p: number) => g * p;

export const risqueNet = (g: number, p: number, m?: MaitriseNiveau) => {
  const f = m ? MAITRISE_FACTEUR[m] : 0;
  return Math.ceil(risqueBrut(g, p) * (1 - f));
};

export const niveauCriticite = (score: number) =>
  score >= 12 ? "Élevé" : score >= 8 ? "Modéré+" : score >= 4 ? "Modéré" : "Faible";
