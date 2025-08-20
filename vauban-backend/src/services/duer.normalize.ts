// src/services/duer.normalize.ts
import { DuerDoc } from "../schemas/duer.schema";
import { risqueNet, niveauCriticite } from "../types/risk-metrics";

// --- Overlay local : on ajoute les champs "runtime" que le schéma ne connaît pas forcément
type Maitrise = "AUCUNE" | "PARTIELLE" | "BONNE" | "TRES_BONNE";
type RiskOverlay = DuerDoc["unites"][number]["risques"][number] & {
  applicable?: boolean;
  risque_net?: number;
  maitrise?: Maitrise;
  effectifs_concernes?: number | null;
  penibilite?: boolean | null;
  // on tolère des suivis/mesures plus riches sans casser le typage
  mesures_proposees?: Array<{
    description: string;
    type?: string;
    delai?: string;
    cout_estime?: string;
    reference?: string;
  }>;
};

export function normalizeRisks(doc: DuerDoc): DuerDoc {
  // Deep copy pour éviter la mutation
  const normalized: DuerDoc = JSON.parse(JSON.stringify(doc));

  // Réinitialiser la synthèse
  normalized.synthese.nb_risques_critiques = 0;
  normalized.synthese.nb_risques_importants = 0;
  normalized.synthese.nb_risques_moderes = 0;

  // Parcours unités / risques
  for (const unite of normalized.unites) {
    // On "voit" chaque risque comme un RiskOverlay pendant le traitement
    const risques = (unite.risques as unknown) as RiskOverlay[];

    for (const risque of risques) {
      // Valeur par défaut pour applicable
      if (risque.applicable === undefined) {
        risque.applicable = true;
      }

      // Toujours garantir le tableau des mesures proposées
      if (!Array.isArray(risque.mesures_proposees)) {
        risque.mesures_proposees = [];
      }

      // Calcul du risque net si applicable
      if (risque.applicable) {
        const g = Number(risque.gravite) || 1;
        const p = Number(risque.probabilite) || 1;

        risque.risque_net = risqueNet(g, p, (risque.maitrise as any));

        // Mise à jour compteurs synthèse
        const criticite = niveauCriticite(risque.risque_net || 0);
        if (criticite === "Élevé") {
          normalized.synthese.nb_risques_critiques++;
        } else if (criticite === "Modéré+") {
          normalized.synthese.nb_risques_importants++;
        } else if (criticite === "Modéré") {
          normalized.synthese.nb_risques_moderes++;
        }
      } else {
        // Non applicable => net = 0
        risque.risque_net = 0;
      }
    }
  }

  // Top priorités (tri simple sur risque_net décroissant)
  const allRisks = normalized.unites.flatMap(u => u.risques) as unknown as RiskOverlay[];
  const applicableRisks = allRisks.filter(r => r.applicable !== false);
  const sorted = [...applicableRisks].sort((a, b) => (b.risque_net || 0) - (a.risque_net || 0));

  // ⚠️ clé harmonisée (le schéma courant utilise souvent "top_3_priorites")
  (normalized.synthese as any).top_3_priorites = sorted
    .slice(0, 3)
    .map(r => `${r.danger} - ${r.situation}`);

  return normalized;
}
