export interface SensitiveField {
  value: string;
  isSensitive: boolean;
}

export interface Employe {
  id: string;
  nom: SensitiveField;
  prenom: SensitiveField;
  email: SensitiveField;
  telephone: SensitiveField;
  poste: SensitiveField;
}

export interface Entreprise {
  id: string;
  nom: SensitiveField;
  siret: SensitiveField;
  adresse: SensitiveField;
  secteur: SensitiveField;
  employes: Employe[];
  [key: string]: string | SensitiveField | Employe[];
  // ... autres champs au besoin
}
