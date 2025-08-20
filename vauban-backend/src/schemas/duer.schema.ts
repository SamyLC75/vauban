import { z } from "zod";

/** Mesure proposée (types bornés) */
const Measure = z.object({
  type: z.enum(["collective", "individuelle", "formation"]).optional(),
  description: z.string().min(5),
  delai: z.string().optional(),
  cout_estime: z.string().optional(),
  reference: z.string().optional(),
});

/** Risque */
const Risk = z.object({
  id: z.string(),
  danger: z.string().min(3),
  situation: z.string().min(3),
  gravite: z.number().int().min(1).max(4),
  probabilite: z.number().int().min(1).max(4),
  priorite: z.union([z.number().int(), z.string().transform(Number)]).transform(n => Number(n)),
  mesures_existantes: z.array(z.string()).default([]),
  mesures_proposees: z.array(Measure).default([]),
  
  // Optional computed/meta fields
  applicable: z.boolean().optional(),
  maitrise: z.enum(["AUCUNE", "PARTIELLE", "BONNE", "TRES_BONNE"]).optional(),
  risque_net: z.number().optional(),
  effectifs_concernes: z.coerce.number().int().min(0).nullable().optional(),
  penibilite: z.boolean().nullable().optional(),
  suivi: z.object({
    responsable: z.string().optional(),
    echeance: z.string().optional(),
    indicateur: z.string().optional(),
  }).default({}),
});

export const DuerSchema = z.object({
  secteur: z.string(),
  date_generation: z.string(),
  unites: z.array(z.object({
    id: z.string().optional(),       // tolère un id d'unité s'il existe
    nom: z.string(),
    risques: z.array(Risk)
  })),
  synthese: z.object({
    nb_risques_critiques: z.coerce.number().default(0),
    nb_risques_importants: z.coerce.number().default(0),
    nb_risques_moderes: z.coerce.number().default(0),
    top_3_priorites: z.array(z.string()).default([]),
    budget_prevention_estime: z.string().default("—"),
    conformite_reglementaire: z.object({
      points_forts: z.array(z.string()).default([]),
      points_vigilance: z.array(z.string()).default([]),
    }).partial().default({}),
  }),
});

export type DuerDoc = z.infer<typeof DuerSchema>;
