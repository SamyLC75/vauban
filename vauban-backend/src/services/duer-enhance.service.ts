import { DuerDoc } from "../schemas/duer.schema";

type Risk = {
  id: string;
  danger: string;
  situation: string;
  gravite: number;
  probabilite: number;
  priorite: number;
  mesures_existantes: string[];
  mesures_proposees: Array<{
    type: string;
    description: string;
    delai?: string;
    cout_estime?: string;
    reference?: string;
  }>;
  suivi: {
    responsable?: string;
    echeance?: string;
    indicateur?: string;
  };
};

type Answers = Record<string, any>;

/**
 * Enhances the DUER document with organizational risks based on answers and options
 */
export function enhanceWithOrgRisks(answers: Answers, doc: DuerDoc, opts?: { budgetSerre?: boolean }): DuerDoc {
  // 1) CACES
  const cacesYes = Object.values(answers).some(v =>
    String(v).toLowerCase().includes('caces') && /manquant|expir|non/i.test(String(v))
  );

  if (cacesYes) {
    pushRisk(doc, {
      danger: "Absence / expiration d'autorisations CACES",
      situation: "Conduite d'engins ou chariots sans autorisation valide",
      gravite: 3, 
      probabilite: 3, 
      priorite: 9,
      mesures_existantes: [],
      mesures_proposees: [
        { 
          type: "organisationnelle", 
          description: "Planifier recyclage CACES (liste nominative + échéances)", 
          delai: "≤ 30 jours", 
          cout_estime: "≈ 300€ / pers." 
        },
        { 
          type: "formation", 
          description: "Former les nouveaux entrants avant prise de poste", 
          delai: "continu", 
          cout_estime: "—" 
        },
        { 
          type: "organisationnelle", 
          description: "Registre de suivi CACES avec alertes d'expiration", 
          delai: "immédiat", 
          cout_estime: "—" 
        },
      ],
      suivi: { 
        responsable: "Responsable RH / Responsable d'exploitation",
        echeance: "3 mois",
        indicateur: "% salariés CACES valides" 
      }
    });
  }

  // 2) Emergency procedures
  pushRisk(doc, {
    danger: "Procédures d'urgence incomplètes",
    situation: "Absence de protocole en cas d'intoxication, incendie ou évacuation",
    gravite: 4, 
    probabilite: 2, 
    priorite: 8,
    mesures_existantes: [],
    mesures_proposees: [
      { 
        type: "organisationnelle", 
        description: "Établir et afficher procédure d'évacuation + point de rassemblement", 
        delai: "immédiat" 
      },
      { 
        type: "formation", 
        description: "Exercice d'évacuation et trousse de secours contrôlée", 
        delai: "≤ 60 jours" 
      },
      { 
        type: "organisationnelle", 
        description: "Désigner des équipiers SST / évacuation", 
        delai: "≤ 30 jours" 
      },
    ],
    suivi: { 
      responsable: "Responsable HSE / Responsable d'établissement",
      echeance: "1 mois",
      indicateur: "1 exercice/semestre ; taux de participation" 
    }
  });

  // 3) Ventilation maintenance (if ventilation measures are present)
  const hasVentil = doc.unites.some(u =>
    u.risques.some(r => r.mesures_proposees?.some(m => /ventilation/i.test(m.description)))
  );
  
  if (hasVentil) {
    pushRisk(doc, {
      danger: "Maintenance préventive ventilation non planifiée",
      situation: "Arrêt d'activité ou exposition accrue si panne",
      gravite: 3, 
      probabilite: 2, 
      priorite: 6,
      mesures_existantes: [],
      mesures_proposees: [
        { 
          type: "organisationnelle", 
          description: "Contrat de maintenance + contrôles trimestriels", 
          delai: "≤ 90 jours", 
          cout_estime: "≈ 300–600€/an" 
        },
        { 
          type: "technique", 
          description: "Capteurs simple flux / dépression avec alerte", 
          delai: "≤ 120 jours" 
        },
      ],
      suivi: {
        responsable: "Responsable maintenance / Responsable technique",
        echeance: "1 mois",
        indicateur: "Taux de disponibilité (%) ventilation" 
      }
    });
  }

  // 4) Budget phasing
  tagBudgetPhasing(doc, !!opts?.budgetSerre);

  return doc;
}

/**
 * Adds a risk to the specified unit (or creates it if it doesn't exist)
 */
function pushRisk(doc: DuerDoc, risk: Omit<Risk, "id">, unitName = "Organisation") {
  // Find or create the unit
  let unit = doc.unites.find(u => u.nom.toLowerCase() === unitName.toLowerCase());
  if (!unit) {
    unit = { 
      nom: unitName, 
      risques: [] 
    };
    doc.unites.push(unit);
  }
  
  // Add the risk with a generated ID
  unit.risques.push({
    id: `R-${Math.random().toString(36).slice(2, 8)}`,
    ...risk
  });
}

/**
 * Tags measures with budget phasing information
 */
function tagBudgetPhasing(doc: DuerDoc, budgetSerre: boolean) {
  for (const u of doc.unites) {
    for (const r of u.risques) {
      if (!r.mesures_proposees?.length) continue;
      
      const phased: typeof r.mesures_proposees = [];
      
      for (const m of r.mesures_proposees) {
        // Phase 1 (low-cost / immediate)
        phased.push({
          ...m,
          description: `PHASE 1 — ${m.description}`,
          delai: m.delai || "≤ 30 jours",
          cout_estime: m.cout_estime || (budgetSerre ? "0–500€" : "—")
        });

        // Phase 2 (structural) for certain types of measures
        if (/ventilation|capotage|isolation|collective|localisé/i.test(m.description)) {
          phased.push({
            ...m,
            description: `PHASE 2 — ${m.description}`,
            delai: "≤ 6–12 mois",
            cout_estime: m.cout_estime || "2 000–8 000€"
          });
        }
      }
      
      // Replace original measures with phased ones if any were added
      if (phased.length > 0) {
        r.mesures_proposees = phased;
      }
    }
  }
}
