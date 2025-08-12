export interface PCAProcessusCritique {
    id: string;
    nom: string;
    responsable: string;
    modeDeSecours: string;
    ressourcesNecessaires: string;
    isSensitive?: boolean;
  }
  
  export interface PCAPlan {
    id: string;
    nom: string;
    scenarios: string[];
    processus: PCAProcessusCritique[];
    mesuresGenerales: string;
    dateMaj: string;
  }
  