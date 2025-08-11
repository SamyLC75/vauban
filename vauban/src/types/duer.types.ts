export interface DUERRisk {
  id: string;
  danger: string;
  situation: string;
  gravite: number;
  probabilite: number;
  priorite: number;
  mesures_existantes: string[];
  mesures_proposees: any[];
  suivi: any;
}

export interface DUERUnit {
  nom: string;
  risques: DUERRisk[];
}

export interface Question {
  id: string;
  question: string;
  type: string;
  justification: string;
}

export interface DUER {
  id: string;
  sector: string;
  unites: DUERUnit[];
  date: string;
  historique: string;
  contraintes: string;
  reponses: Record<string, string>;
  synthese: {
    nb_risques_critiques: number;
    nb_risques_importants: number;
    nb_risques_moderes: number;
    budget_prevention_estime: number;
  };
}
