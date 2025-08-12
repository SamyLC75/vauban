export type SensibleField =
  | "nomUtilisateur"
  | "emailUtilisateur"
  | "nomEmploye"
  | "emailEmploye"
  | "telEmploye"
  | "region"
  | "effectif"
  | "secteur"
  | "sousSecteur";

export type SensitivitySettings = {
  [K in SensibleField]: boolean;
};

// Valeurs par défaut :
export const DEFAULT_SENSITIVITY: SensitivitySettings = {
  nomUtilisateur: true,
  emailUtilisateur: true,
  nomEmploye: true,
  emailEmploye: true,
  telEmploye: true,
  region: false,
  effectif: false,
  secteur: false,
  sousSecteur: false,
};
