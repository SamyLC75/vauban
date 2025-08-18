// src/components/duer/DUERWizard.tsx
import React, { useEffect, useMemo, useState } from "react";
import DUERView from "./DUERView";
import { RiskMatrixEditor } from "../risks/RiskMatrixEditor";
import { QuestionFlow, Question } from "../flow/QuestionFlow";
import { Risk, UniteTravail, DuerDoc } from "../../types/duer.types";
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Loader2,
  FileText,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
} from "lucide-react";

/** ---------- Types ---------- */
interface DUERGenerateResponse {
  success: boolean;
  duerId?: string;
  warning?: string;
  duer?: { duer: DuerDoc } | DuerDoc; // on tolère les deux formes rencontrées
  error?: string;
}

function normalizeDuer(doc: DuerDoc): DuerDoc {
  return {
    ...doc,
    unites: doc.unites.map((u: UniteTravail, uIdx: number) => ({
      ...u,
      id: u.id ?? `U${uIdx}-${u.nom}`,
      risques: u.risques.map((r: Risk, rIdx: number) => ({
        ...r,
        id: r.id ?? `R${uIdx}-${rIdx}-${r.danger}-${r.situation}`,
      })),
    })),
  };
}

function nextQuestionId(existing: string[]) {
  // génère Q1, Q2... en évitant collisions
  let n = existing.length + 1;
  let id = `Q${n}`;
  while (existing.includes(id)) {
    n += 1;
    id = `Q${n}`;
  }
  return id;
}

function makeUniqueQuestions(existing: Question[], incoming: Question[]): Question[] {
  const byText = new Set(existing.map(q => q.question.trim().toLowerCase()));
  const ids = new Set(existing.map(q => q.id));
  const result: Question[] = [];

  for (const q of incoming) {
    const textKey = q.question.trim().toLowerCase();
    if (byText.has(textKey)) continue; // skip doublon texte

    // id unique
    let id = q.id?.trim() || "";
    if (!id || ids.has(id)) {
      id = nextQuestionId(Array.from(ids));
    }
    ids.add(id);
    byText.add(textKey);

    result.push({ ...q, id });
  }
  return result;
}

function mergeQuestions(existing: Question[], incoming: IAQuestion[]): Question[] {
  const seen = new Set(existing.map(q => q.id));

  const normalized = incoming.map((q) => {
    // type sûr
    const type: "oui_non" | "texte" =
      q.type === "oui_non" || q.type === "texte" ? q.type : "texte";

    // ID unique
    let id = q.id || Math.random().toString(36).slice(2, 10);
    while (seen.has(id)) id = `${q.id}-${Math.random().toString(36).slice(2, 6)}`;
    seen.add(id);

    return {
      id,
      question: q.question,
      type,
      showIf: q.showIf?.map(c => ({ qid: c.qid, equals: c.equals })),
    } as Question;
  });

  return [...existing, ...normalized];
}

async function loadDUERById(id: string): Promise<DuerDoc> {
  const data = await apiFetch<any>(`/api/duer/${id}`, { method: "GET" });
  if (!data?.duer) throw new Error("Format de réponse inattendu");
  // Normaliser la structure de la réponse (peut être {duer: DuerDoc} ou directement DuerDoc)
  const doc = data.duer.duer || data.duer;
  return normalizeDuer(doc);
}

// Helper pour les requêtes PATCH
export async function patchDUER(id: string, ops: any[]) {
  return apiFetch(`/api/duer/${id}/patch`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ops }),
  });
}

// Helper pour télécharger le CSV
async function downloadCSV(duerId: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/duer/${duerId}/csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error(`CSV: HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; 
  a.download = `DUER_${duerId}.csv`;
  document.body.appendChild(a); 
  a.click(); 
  a.remove();
  URL.revokeObjectURL(url);
}

export type IAQuestion = {
  id: string;
  question: string;
  type: "oui_non" | "texte" | string;
  showIf?: { qid: string; equals: string }[];
  justification?: string;
};

interface IAQuestionsResponse {
  questions: IAQuestion[];
  warning?: string;
}

/** ---------- Helpers ---------- */
const API_BASE = import.meta.env?.VITE_API_URL ?? "http://localhost:5001";

function getToken(): string | null {
  // lit les deux clés pour tolérer les reliquats
  return (
    localStorage.getItem("vauban_token") ||
    localStorage.getItem("token") ||
    null
  );
}

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      /* noop */
    }
    const message =
      payload?.error ||
      payload?.message ||
      `HTTP ${res.status} ${res.statusText || ""}`;
    throw new Error(message);
  }
  // certains endpoints peuvent renvoyer du binaire (PDF). Ici, on reste JSON.
  return (await res.json()) as T;
}

function priorityPillClass(priority: number) {
  if (priority >= 12) return "text-red-600 bg-red-50";
  if (priority >= 8) return "text-orange-600 bg-orange-50";
  if (priority >= 4) return "text-yellow-600 bg-yellow-50";
  return "text-green-600 bg-green-50";
}

function gravityLabel(level: number) {
  const labels = ["", "Faible", "Modérée", "Grave", "Très grave"];
  return labels[level] || "";
}

/** ---------- Composant ---------- */
const DUERWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [duer, setDuer] = useState<DUERGenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    sector: "",
    size: "TPE" as "TPE" | "PME" | "ETI",
    unites: [""],
    historique: "",        // on garde pour compat (rempli au submit)
    contraintes: "",      // on garde pour compat (rempli au submit)
    reponses: {} as Record<string, any>,
    weightProb: 1.0,  // Poids pour la probabilité
    weightGrav: 1.1,  // Poids pour la gravité
  });
  
  const [histList, setHistList] = useState<string[]>([""]);
  const [consList, setConsList] = useState<string[]>([""]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [generatedDUER, setGeneratedDUER] = useState<DuerDoc | null>(null);
  const [duerId, setDuerId] = useState<string | undefined>(undefined);

  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [riskExplanation, setRiskExplanation] = useState<{
    resume_simple: string;
    statistiques?: string;
    exemple_accident?: string;
    reference_principale?: string;
    conseil_pratique?: string;
  } | null>(null);



  // Supprimer un risque
  const handleDeleteRisk = async (unitId: string, riskId: string) => {
    if (!duerId || !confirm('Êtes-vous sûr de vouloir supprimer ce risque ?')) {
      return;
    }
    
    try {
      await patchDUER(duerId, [{
        op: 'remove_risk',
        unitId,
        riskId
      }]);
      
      // Mise à jour locale
      if (generatedDUER) {
        const updatedUnites = generatedDUER.unites.map(unit => {
          if ((unit.id === unitId) || (unit.nom === unitId)) {
            return {
              ...unit,
              risques: unit.risques.filter((r: Risk) => r.id !== riskId)
            };
          }
          return unit;
        });
        
        setGeneratedDUER({
          ...generatedDUER,
          unites: updatedUnites
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du risque');
    }
  };

  // Vérif token (sans forcer un 0: login ici ; on suppose la page est protégée en amont)
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError(
        "Vous n'êtes pas connecté(e). Merci de vous authentifier avant de générer un DUER."
      );
    }
  }, []);

  // Initialisation des listes à partir des données du formulaire
  useEffect(() => {
    if (formData.historique) {
      const histItems = formData.historique
        .split('\n')
        .map(s => s.replace(/^-\s*/, '').trim())
        .filter(Boolean);
      if (histItems.length > 0) {
        setHistList(histItems);
      }
    }
    
    if (formData.contraintes) {
      const consItems = formData.contraintes
        .split('\n')
        .map(s => s.replace(/^-\s*/, '').trim())
        .filter(Boolean);
      if (consItems.length > 0) {
        setConsList(consItems);
      }
    }
  }, [formData.historique, formData.contraintes]);

  /** --------- Étape 1 : fetch questions IA --------- */
  const handleStep1Submit = async () => {
    try {
      setError("");
      if (!formData.sector.trim()) {
        setError("Veuillez renseigner le secteur d'activité.");
        return;
      }
      const filledUnits = formData.unites.map((u) => u.trim()).filter(Boolean);
      if (filledUnits.length === 0) {
        setError("Veuillez saisir au moins une unité de travail.");
        return;
      }

      setLoading(true);

      // optionnel : check status IA (on ignore authenticated ici)
      await apiFetch<{ mistralConfigured: boolean }>("/api/status").then(
        (s) => {
          if (!s.mistralConfigured) {
            throw new Error(
              "Le service IA n'est pas configuré côté serveur (clé absente)."
            );
          }
        }
      );

      // Formatage des listes pour l'envoi
      const histString = histList.filter(s => s.trim()).map(s => `- ${s.trim()}`).join("\n");
      const consString = consList.filter(s => s.trim()).map(s => `- ${s.trim()}`).join("\n");

      // Mise à jour des champs de formulaire pour la compatibilité
      setFormData(prev => ({
        ...prev,
        historique: histString,
        contraintes: consString
      }));

      const payload = {
        sector: formData.sector,
        size: formData.size,
        unites: filledUnits,
        weightProb: formData.weightProb,
        weightGrav: formData.weightGrav,
        historique: histList.filter(s => s.trim()),
        contraintes: consList.filter(s => s.trim()),
      };

      const data = await apiFetch<IAQuestionsResponse>(
        "/api/duer/ia-questions",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      // Convertir les questions IA en format QuestionFlow
      const convertedQuestions = Array.isArray(data?.questions) 
        ? data.questions.map(q => ({
            id: q.id,
            question: q.question,
            type: q.type as "oui_non" | "texte",
            showIf: q.showIf ? q.showIf.map(c => ({
              qid: c.qid,
              equals: c.equals
            })) : undefined
          })) 
        : [];

      // Utiliser makeUniqueQuestions pour éviter les doublons
      setQuestions(prev => makeUniqueQuestions(prev, convertedQuestions));
      setStep(2);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la récupération des questions.");
    } finally {
      setLoading(false);
    }
  };

  /** --------- Étape 2 : valider réponses --------- */
  const allAnswered = useMemo(() => {
    if (!questions.length) return true;
    return questions.every(q => {
      const v = formData.reponses[q.id];
      if (q.type === "oui_non") return v === "oui" || v === "non";
      return typeof v === "string" && v.trim().length > 0;
    });
  }, [questions, formData.reponses]);

  const handleStep2Submit = () => {
    if (!allAnswered) {
      setError("Merci de répondre à toutes les questions.");
      return;
    }
    setError("");
    setStep(3);
  };

  /** --------- Étape 3 : génération DUER --------- */
  const handleGenerateDUER = async () => {
    try {
      setError("");
      setLoading(true);

      const filledUnits = formData.unites.map(u => u.trim()).filter(Boolean);
      
      // Formatage des listes pour l'envoi
      const histString = histList.filter(s => s.trim()).map(s => `- ${s.trim()}`).join("\n");
      const consString = consList.filter(s => s.trim()).map(s => `- ${s.trim()}`).join("\n");

      // Mise à jour des champs de formulaire pour la compatibilité
      setFormData(prev => ({
        ...prev,
        historique: histString,
        contraintes: consString
      }));

      const payload = {
        sector: formData.sector,
        size: formData.size,
        unites: filledUnits,
        historique: histList.filter(s => s.trim()),
        contraintes: consList.filter(s => s.trim()),
        reponses: formData.reponses || {},
        weightProb: formData.weightProb,
        weightGrav: formData.weightGrav,
      };

      const res: any = await apiFetch("/api/duer/ia-generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // 3 cas possibles :
      // A) { success:true, duerId, duer:{...} }           → direct
      // B) { success:true, duerId, duer:{duer:{...}} }    → direct (nested)
      // C) { duerId }                                     → on va chercher via GET /api/duer/:id

      let doc: DuerDoc | null = null;
      let id: string | undefined = undefined;

      if (res?.success && (res?.duer || res?.duer?.duer)) {
        doc = (res.duer?.duer || res.duer) as DuerDoc;
        id = res.duerId;
      } else if (res?.duerId && !res?.duer) {
        // 👉 cas que tu viens d'avoir
        id = res.duerId as string;
        doc = await loadDUERById(id);
      } else {
        const keys = typeof res === "object" && res ? Object.keys(res).join(",") : typeof res;
        throw new Error(`Réponse inattendue (success/doc manquants). Clés: ${keys || "n/a"}`);
      }

      setGeneratedDUER(doc);
      setDuerId(id);
      setStep(4);

      if (res?.warning) console.warn("DUER warning:", res.warning);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la génération du DUER.");
    } finally {
      setLoading(false);
    }
  };

  /** --------- Étape 4 : Explication d’un risque --------- */
  const explainRisk = async (risk: Risk) => {
    try {
      setSelectedRisk(risk);
      setRiskExplanation(null);

      // si endpoint existe côté backend:
      // POST /api/duer/ia-explain  { danger, situation, gravite, probabilite, ... }
      // s'il n'existe pas, on fallback avec un simulateur
      try {
        const res = await apiFetch<{
          resume_simple: string;
          statistiques?: string;
          exemple_accident?: string;
          reference_principale?: string;
          conseil_pratique?: string;
        }>("/api/duer/ia-explain", {
          method: "POST",
          body: JSON.stringify({
            danger: risk.danger,
            situation: risk.situation,
            gravite: risk.gravite,
            probabilite: risk.probabilite,
          }),
        });
        setRiskExplanation(res);
      } catch {
        // fallback local (si route non implémentée)
        setTimeout(() => {
          setRiskExplanation({
            resume_simple: `Le « ${risk.danger} » est fréquent dans ce contexte et peut générer des arrêts de travail.`,
            statistiques: "≈ 20–30% des AT liés au contexte évoqué (ordre de grandeur).",
            exemple_accident:
              "Ex.: glissade sur sol humide lors d'un déplacement entre bureaux.",
            reference_principale:
              "Code du travail — Principes généraux de prévention",
            conseil_pratique:
              "Former aux bons gestes/postures et assurer un entretien régulier des zones de circulation.",
          });
        }, 700);
      }
    } catch (e) {
      setRiskExplanation({
        resume_simple:
          "Impossible de récupérer l’explication détaillée pour ce risque pour le moment.",
      });
    }
  };

  /** --------- Export PDF --------- */
  const handleExportPDF = async () => {
    if (!duerId) {
      setError(
        "Export PDF indisponible (identifiant DUER manquant). Génère d'abord le DUER."
      );
      return;
    }
    try {
      setError("");
      setLoading(true);
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/duer/${duerId}/pdf`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
          txt || `Export PDF: HTTP ${res.status} ${res.statusText || ""}`
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DUER_${duerId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l’export PDF.");
    } finally {
      setLoading(false);
    }
  };

  /** ---------- Rendu ---------- */
  if (duer && duer.duer) {
    const doc = 'duer' in duer.duer ? duer.duer.duer : duer.duer;
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">DUER Généré</h2>
        <DUERView duerId={duer.duerId!} initialDoc={doc} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header + progression */}
        <div className="border-b px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Générateur DUER avec IA
          </h2>

          <div className="mt-4 flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= (s as any)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step > (s as any) ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    s
                  )}
                </div>
                {s < 4 && (
                  <div
                    className={`w-24 h-1 ${
                      step > (s as any) ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-600">Informations</span>
            <span className="text-gray-600">Questions IA</span>
            <span className="text-gray-600">Génération</span>
            <span className="text-gray-600">Résultat</span>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Étape 1 */}
        {step === 1 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Informations sur votre entreprise
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Secteur d'activité
                </label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: BTP, Restauration, Industrie..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Taille de l'entreprise
                </label>
                <select
                  value={formData.size}
                  onChange={(e) => {
                    const newSize = e.target.value as "TPE" | "PME" | "ETI";
                    const weights = {
                      TPE: { weightProb: 1.0, weightGrav: 1.1 },
                      PME: { weightProb: 1.1, weightGrav: 1.15 },
                      ETI: { weightProb: 1.2, weightGrav: 1.2 }
                    }[newSize];
                    setFormData({ 
                      ...formData, 
                      size: newSize,
                      weightProb: weights.weightProb,
                      weightGrav: weights.weightGrav
                    });
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="TPE">TPE (moins de 10 salariés)</option>
                  <option value="PME">PME (10-250 salariés)</option>
                  <option value="ETI">ETI (plus de 250 salariés)</option>
                </select>
              </div>

              <div>
                <RiskMatrixEditor
                  weightProb={formData.weightProb}
                  weightGrav={formData.weightGrav}
                  onChange={(prob, grav) => setFormData({
                    ...formData,
                    weightProb: prob,
                    weightGrav: grav
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Unités de travail
                </label>
                <div className="space-y-2">
                  {formData.unites.map((u, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={u}
                        onChange={(e) => {
                          const newUnits = [...formData.unites];
                          newUnits[i] = e.target.value;
                          setFormData({ ...formData, unites: newUnits });
                        }}
                        className="flex-1 border rounded px-3 py-2"
                        placeholder="Ex: Atelier, Bureau, Site..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newUnits = [...formData.unites];
                          newUnits.splice(i, 1);
                          setFormData({ ...formData, unites: newUnits });
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, unites: [...formData.unites, ""] })}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    + Ajouter une unité
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Historique des incidents/accidents</label>
                <p className="text-xs text-gray-500 mb-2">
                  Un "accident" peut être physique, psychologique, matériel ou organisationnel (ex: interruption de service). Une ligne par élément.
                </p>
                <div className="space-y-2">
                  {histList.map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="flex-1 border rounded px-3 py-2"
                        placeholder="Ex: chute de chaise en cours d'arts plastiques"
                        value={v}
                        onChange={(e) => {
                          const arr = [...histList]; 
                          arr[i] = e.target.value; 
                          setHistList(arr);
                        }}
                      />
                      <button 
                        type="button"
                        className="text-red-600" 
                        onClick={() => {
                          const arr = [...histList]; 
                          arr.splice(i, 1); 
                          setHistList(arr.length ? arr : [""]);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => setHistList([...histList, ""])}
                  >
                    + Ajouter un élément
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contraintes spécifiques</label>
                <div className="space-y-2">
                  {consList.map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="flex-1 border rounded px-3 py-2"
                        placeholder="Ex: salles inadaptées, subventions limitées à 6000h, ..."
                        value={v}
                        onChange={(e) => {
                          const arr = [...consList]; 
                          arr[i] = e.target.value; 
                          setConsList(arr);
                        }}
                      />
                      <button 
                        type="button"
                        className="text-red-600" 
                        onClick={() => {
                          const arr = [...consList]; 
                          arr.splice(i, 1); 
                          setConsList(arr.length ? arr : [""]);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => setConsList([...consList, ""])}
                  >
                    + Ajouter une contrainte
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleStep1Submit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Étape 2 : Questions IA */}
        {step === 2 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Questions pour affiner votre DUER
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-600">
                  L'IA a généré ces questions pour mieux comprendre vos risques spécifiques.
                </p>
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const payload = {
                        sector: formData.sector,
                        size: formData.size,
                        unites: formData.unites,
                        reponses: formData.reponses
                      };
                      const data = await apiFetch<IAQuestionsResponse>(
                        "/api/duer/ia-questions",
                        {
                          method: "POST",
                          body: JSON.stringify(payload),
                        }
                      );
                      const newQuestions = data?.questions.map(q => ({
                        id: q.id,
                        question: q.question,
                        type: q.type as "oui_non" | "texte",
                        showIf: q.showIf ? q.showIf.map(c => ({
                          qid: c.qid,
                          equals: c.equals
                        })) : undefined
                      })) || [];
                      setQuestions(prev => makeUniqueQuestions(prev, newQuestions));
                    } catch (e: any) {
                      setError(e?.message || "Erreur lors de la récupération de nouvelles questions.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <HelpCircle className="w-4 h-4" />
                      Poser d'autres questions
                    </>
                  )}
                </button>
              </div>
              
              <QuestionFlow
                questions={questions}
                values={formData.reponses}
                onChange={(id, val) =>
                  setFormData(prev => ({ ...prev, reponses: { ...prev.reponses, [id]: val } }))
                }
              />
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Retour
              </button>
              <button
                onClick={handleStep2Submit}
                disabled={!allAnswered}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 : Génération */}
        {step === 3 && (
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-4">
              Prêt à générer votre DUER
            </h3>

            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <p className="text-gray-700 mb-4">
                L'IA va maintenant analyser vos informations et générer un DUER
                personnalisé incluant :
              </p>
              <ul className="text-left max-w-md mx-auto space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Identification des risques par unité
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Évaluation gravité/probabilité
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Mesures de prévention adaptées
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Plan d'actions prioritaires
                </li>
              </ul>
            </div>

            <button
              onClick={handleGenerateDUER}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Générer mon DUER
                </>
              )}
            </button>
          </div>
        )}

        {/* Étape 4 : Résultat */}
        {step === 4 && generatedDUER && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Votre DUER généré</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Exporter PDF
                </button>
                {duerId && (
                  <button
                    onClick={() => downloadCSV(duerId)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Exporter CSV
                  </button>
                )}
              </div>
            </div>

            {/* Synthèse */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-3">Synthèse</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {generatedDUER.synthese.nb_risques_critiques}
                  </div>
                  <div className="text-sm text-gray-600">Risques critiques</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {generatedDUER.synthese.nb_risques_importants}
                  </div>
                  <div className="text-sm text-gray-600">
                    Risques importants
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {generatedDUER.synthese.nb_risques_moderes}
                  </div>
                  <div className="text-sm text-gray-600">Risques modérés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {generatedDUER.synthese.budget_prevention_estime}
                  </div>
                  <div className="text-sm text-gray-600">Budget prévention</div>
                </div>
              </div>
            </div>

            {/* Unités & risques */}
            {generatedDUER.unites.map((unite: UniteTravail, uniteIdx: number) => (
              <div key={unite.id || `unite-${uniteIdx}-${unite.nom}`} className="mb-6">
                <h4 className="font-semibold mb-3 text-lg">{unite.nom}</h4>

                <div className="space-y-3">
                  {unite.risques.map((risque: Risk, risqueIdx: number) => (
                    <div
                      key={risque.id || `${unite.id || `unite-${uniteIdx}-${unite.nom}`}-risque-${risqueIdx}-${risque.danger}-${risque.situation}`}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle
                              className={`w-5 h-5 ${
                                risque.priorite >= 12
                                  ? "text-red-600"
                                  : risque.priorite >= 8
                                  ? "text-orange-600"
                                  : risque.priorite >= 4
                                  ? "text-yellow-600"
                                  : "text-green-600"
                              }`}
                            />
                            <h5 className="font-medium">{risque.danger}</h5>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${priorityPillClass(
                                risque.priorite
                              )}`}
                            >
                              Priorité: {risque.priorite}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-2">
                            {risque.situation}
                          </p>

                          <div className="flex gap-4 text-sm">
                            <span>
                              Gravité:{" "}
                              <strong>{gravityLabel(risque.gravite)}</strong>
                            </span>
                            <span>
                              Probabilité:{" "}
                              <strong>{risque.probabilite}/4</strong>
                            </span>
                          </div>

                          {risque.mesures_proposees?.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm font-medium mb-1">
                                Mesures proposées:
                              </p>
                              <ul className="text-sm text-gray-600 list-disc list-inside">
                                {risque.mesures_proposees.map((m, idx) => (
                                  <li key={`${risque.id}-${idx}-${m.description}`}>
                                    {m.description}
                                    {m.cout_estime ? ` (${m.cout_estime})` : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex flex-col items-end gap-2">
                          <button
                            onClick={() => explainRisk(risque)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Obtenir plus d'informations"
                          >
                            <HelpCircle className="w-5 h-5" />
                          </button>

                          {duerId && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeleteRisk(
                                  (unite as any).id || unite.nom,
                                  (risque as any).id || `${unite.nom}-${risque.danger}-${risque.situation}`
                                )}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Supprimer ce risque"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                              <details className="w-56">
                                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                                  Modifier
                                </summary>
                                <div className="mt-2 p-2 border rounded-lg bg-gray-50">
                                  <label className="block text-xs text-gray-600">Gravité (1..4)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={4}
                                    defaultValue={risque.gravite}
                                    className="w-full border rounded px-2 py-1 text-sm mb-2"
                                    onChange={(e) => (risque.gravite = Number(e.target.value))}
                                  />
                                  <label className="block text-xs text-gray-600">Probabilité (1..4)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={4}
                                    defaultValue={risque.probabilite}
                                    className="w-full border rounded px-2 py-1 text-sm mb-2"
                                    onChange={(e) => (risque.probabilite = Number(e.target.value))}
                                  />
                                  <button
                                    className="w-full px-2 py-1 bg-blue-600 text-white rounded text-sm"
                                    onClick={async () => {
                                      try {
                                        await patchDUER(duerId!, [{
                                          op: 'edit_risk',
                                          unitId: (unite as any).id || unite.nom,
                                          riskId: (risque as any).id || `${unite.nom}-${risque.danger}-${risque.situation}`,
                                          data: { 
                                            gravite: risque.gravite, 
                                            probabilite: risque.probabilite 
                                          }
                                        }]);
                                        // Mise à jour locale (recalcul priorité)
                                        const g = Number(risque.gravite) || 1;
                                        const p = Number(risque.probabilite) || 1;
                                        risque.priorite = g * p;
                                        setGeneratedDUER({ ...generatedDUER! });
                                      } catch (e: any) {
                                        setError(e?.message || "Échec de la mise à jour");
                                      }
                                    }}
                                  >
                                    Enregistrer
                                  </button>
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Panneau latéral d'explication */}
            {selectedRisk && (
              <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Explication détaillée</h4>
                  <button
                    onClick={() => {
                      setSelectedRisk(null);
                      setRiskExplanation(null);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {riskExplanation ? (
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">
                        Résumé simple
                      </h5>
                      <p className="text-sm">{riskExplanation.resume_simple}</p>
                    </div>

                    {riskExplanation.statistiques && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">
                          Statistiques
                        </h5>
                        <p className="text-sm">
                          {riskExplanation.statistiques}
                        </p>
                      </div>
                    )}

                    {riskExplanation.exemple_accident && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">
                          Exemple concret
                        </h5>
                        <p className="text-sm">
                          {riskExplanation.exemple_accident}
                        </p>
                      </div>
                    )}

                    {riskExplanation.reference_principale && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">
                          Référence réglementaire
                        </h5>
                        <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                          {riskExplanation.reference_principale}
                        </p>
                      </div>
                    )}

                    {riskExplanation.conseil_pratique && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">
                          Conseil pratique
                        </h5>
                        <p className="text-sm bg-blue-50 p-3 rounded">
                          💡 {riskExplanation.conseil_pratique}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DUERWizard;
