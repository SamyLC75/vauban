export type Gravite = 1 | 2 | 3; // 1=faible, 2=moyenne, 3=forte

export interface Risk {
  id: string;
  unite: string;
  danger: string;
  gravite: Gravite;
  mesures: string;
  isSensitive?: boolean; // Pour masquer le champ selon la config
}
