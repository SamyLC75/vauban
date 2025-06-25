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
  [K in SensibleField]: boolean; // true = chiffré, false = pas chiffré
};

// Valeurs par défaut (tjs chiffré pour identités/contact)
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
