export type Risk = {
  id?: string;
  danger: string;
  situation: string;
  gravite: number;
  probabilite: number;
  priorite: number;
  maitrise?: "AUCUNE" | "PARTIELLE" | "BONNE" | "TRES_BONNE";
  risque_net?: number;
  applicable?: boolean;
  effectifs_concernes?: number | null;
  penibilite?: boolean | null;
  mesures_existantes: string[];
  mesures_proposees: {
    type: string;
    description: string;
    delai?: string;
    cout_estime?: string;
    reference?: string;
  }[];
  suivi: {
    responsable?: string;
    echeance?: string;
    indicateur?: string;
    date_decision?: string;
    realise_le?: string;
  };
};

export type UniteTravail = {
  id?: string;
  nom: string;
  risques: Risk[];
};

export type IAQuestion = {
  id: string;
  question: string;
  type: "oui_non" | "texte" | string;
  showIf?: { qid: string; equals: string }[];
  justification?: string;
};

export type DuerDoc = {
  secteur: string;
  date_generation: string;
  unites: UniteTravail[];
  synthese: {
    nb_risques_critiques: number;
    nb_risques_importants: number;
    nb_risques_moderes: number;
    top_3_priorites: string[];
    budget_prevention_estime: string;
    conformite_reglementaire?: {
      points_forts?: string[];
      points_vigilance?: string[];
    };
  };
};
