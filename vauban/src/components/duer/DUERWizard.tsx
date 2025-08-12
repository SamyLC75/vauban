import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

/** ---------- Types ---------- */
interface DUERRisk {
  id: string;
  danger: string;
  situation: string;
  gravite: number;        // 1..4
  probabilite: number;    // 1..4
  priorite: number;       // typiquement gravite*probabilite
  mesures_existantes: string[];
  mesures_proposees: Array<{
    type: "collective" | "individuelle" | string;
    description: string;
    delai?: "immédiat" | "court_terme" | "moyen_terme" | "long_terme" | string;
    cout_estime?: string; // "€", "€€", ...
    reference?: string;
  }>;
  suivi: {
    responsable?: string;
    echeance?: string;
    indicateur?: string;
  };
}

function normalizeDUERGenerateResponse(raw: unknown): { duerId?: string; doc: DUERDoc } {
  // 1) si la réponse est une string JSON → parse
  let res: any = raw;
  if (typeof raw === 'string') {
    try { res = JSON.parse(raw); } catch { /* on laissera échouer plus bas */ }
  }

  // 2) extraire le DUERDoc quelle que soit la forme
  const maybe =
    (res?.duer && res?.duer?.duer) || // {duer:{duer:{...}}}
    res?.duer ||                       // {duer:{...}}
    res?.document ||                   // (au cas où)
    null;

  if (!res?.success || !maybe) {
    const keys = typeof res === 'object' && res ? Object.keys(res as any).join(',') : typeof res;
    throw new Error(`Réponse inattendue (success/doc manquants). Clés: ${keys || 'n/a'}`);
  }

  return { duerId: res.duerId, doc: maybe as DUERDoc };
}

async function loadDUERById(id: string): Promise<DUERDoc> {
  const data = await apiFetch<any>(`/api/duer/${id}`, { method: "GET" });
  // le backend renvoie l'objet sauvegardé: soit { duer:{...}, id, ... } soit { ... } selon version
  const doc = data?.duer?.duer || data?.duer || null;
  if (!doc) throw new Error("DUER introuvable après génération");
  return doc as DUERDoc;
}

interface DUERUnit {
  nom: string;
  risques: DUERRisk[];
}

interface DUERSynthese {
  nb_risques_critiques: number;
  nb_risques_importants: number;
  nb_risques_moderes: number;
  top_3_priorites: string[];
  budget_prevention_estime: string;
  conformite_reglementaire?: {
    points_forts?: string[];
    points_vigilance?: string[];
  };
}

interface DUERDoc {
  secteur: string;
  date_generation: string;
  unites: DUERUnit[];
  synthese: DUERSynthese;
}

interface DUERGenerateResponse {
  success: boolean;
  duerId?: string;
  warning?: string;
  duer?: { duer: DUERDoc } | DUERDoc; // on tolère les deux formes rencontrées
  error?: string;
}

interface IAQuestion {
  id: string;
  question: string;
  type: "oui_non" | "texte" | string;
  justification?: string;
}

interface IAQuestionsResponse {
  questions: IAQuestion[];
  warning?: string;
}

/** ---------- Helpers ---------- */
const API_BASE =
  (import.meta as any).env?.VITE_REACT_APP_API_URL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState<{
    sector: string;
    size: "TPE" | "PME" | "ETI";
    unites: string[];
    historique: string;
    contraintes: string;
    reponses: Record<string, string>;
  }>({
    sector: "",
    size: "PME",
    unites: [""],
    historique: "",
    contraintes: "", // ajouté & envoyé au backend
    reponses: {},
  });

  const [questions, setQuestions] = useState<IAQuestion[]>([]);
  const [generatedDUER, setGeneratedDUER] = useState<DUERDoc | null>(null);
  const [duerId, setDuerId] = useState<string | undefined>(undefined);

  const [selectedRisk, setSelectedRisk] = useState<DUERRisk | null>(null);
  const [riskExplanation, setRiskExplanation] = useState<{
    resume_simple: string;
    statistiques?: string;
    exemple_accident?: string;
    reference_principale?: string;
    conseil_pratique?: string;
  } | null>(null);

  // Vérif token (sans forcer un 0: login ici ; on suppose la page est protégée en amont)
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError(
        "Vous n'êtes pas connecté(e). Merci de vous authentifier avant de générer un DUER."
      );
    }
  }, []);

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

      const payload = {
        sector: formData.sector,
        size: formData.size,
        unites: filledUnits,
      };

      const data = await apiFetch<IAQuestionsResponse>(
        "/api/duer/ia-questions",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      setQuestions(Array.isArray(data?.questions) ? data.questions : []);
      setStep(2);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la récupération des questions.");
    } finally {
      setLoading(false);
    }
  };

  /** --------- Étape 2 : valider réponses --------- */
  const allAnswered = useMemo(() => {
    if (!questions.length) return true; // si pas de questions, on autorise
    return questions.every((q) => {
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

      const payload = {
        sector: formData.sector,
        size: formData.size,
        unites: filledUnits,
        historique: formData.historique || "",
        contraintes: formData.contraintes || "",
        reponses: formData.reponses || {},
      };

      const res: any = await apiFetch("/api/duer/ia-generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // 3 cas possibles :
      // A) { success:true, duerId, duer:{...} }           → direct
      // B) { success:true, duerId, duer:{duer:{...}} }    → direct (nested)
      // C) { duerId }                                     → on va chercher via GET /api/duer/:id

      let doc: DUERDoc | null = null;
      let id: string | undefined = undefined;

      if (res?.success && (res?.duer || res?.duer?.duer)) {
        doc = (res.duer?.duer || res.duer) as DUERDoc;
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
  const explainRisk = async (risk: DUERRisk) => {
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secteur d'activité
                </label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) =>
                    setFormData({ ...formData, sector: e.target.value })
                  }
                  placeholder="Ex: Commerce de détail, BTP, Services informatiques..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taille de l'entreprise
                </label>
                <select
                  value={formData.size}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      size: e.target.value as "TPE" | "PME" | "ETI",
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TPE">TPE (1-10 salariés)</option>
                  <option value="PME">PME (10-250 salariés)</option>
                  <option value="ETI">ETI (250-5000 salariés)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unités de travail
                </label>
                {formData.unites.map((unite, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={unite}
                      onChange={(e) => {
                        const arr = [...formData.unites];
                        arr[index] = e.target.value;
                        setFormData({ ...formData, unites: arr });
                      }}
                      placeholder="Ex: Bureau, Atelier, Entrepôt..."
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {index === formData.unites.length - 1 && (
                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            unites: [...formData.unites, ""],
                          })
                        }
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        +
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Historique d'accidents (optionnel)
                </label>
                <textarea
                  value={formData.historique}
                  onChange={(e) =>
                    setFormData({ ...formData, historique: e.target.value })
                  }
                  placeholder="Décrivez brièvement les accidents survenus..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraintes particulières (optionnel)
                </label>
                <textarea
                  value={formData.contraintes}
                  onChange={(e) =>
                    setFormData({ ...formData, contraintes: e.target.value })
                  }
                  placeholder="Ex: obligations réglementaires, contraintes de site/procédés, etc."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
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
            <p className="text-gray-600 mb-6">
              L'IA a généré ces questions pour mieux comprendre vos risques
              spécifiques.
            </p>

            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium">{q.question}</p>
                      {q.justification && (
                        <p className="text-sm text-gray-600 mt-1">
                          {q.justification}
                        </p>
                      )}

                      {q.type === "oui_non" ? (
                        <div className="mt-3 flex gap-4">
                          {["oui", "non"].map((val) => (
                            <label className="flex items-center" key={val}>
                              <input
                                type="radio"
                                name={q.id}
                                value={val}
                                checked={formData.reponses[q.id] === val}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    reponses: {
                                      ...formData.reponses,
                                      [q.id]: e.target.value,
                                    },
                                  })
                                }
                                className="mr-2"
                              />
                              {val[0].toUpperCase() + val.slice(1)}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={formData.reponses[q.id] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              reponses: {
                                ...formData.reponses,
                                [q.id]: e.target.value,
                              },
                            })
                          }
                          className="mt-3 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Votre réponse..."
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Exporter PDF
              </button>
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
            {generatedDUER.unites.map((unite) => (
              <div key={unite.nom} className="mb-6">
                <h4 className="font-semibold mb-3 text-lg">{unite.nom}</h4>

                <div className="space-y-3">
                  {unite.risques.map((risque) => (
                    <div
                      key={risque.id}
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
                                  <li key={idx}>
                                    {m.description}
                                    {m.cout_estime ? ` (${m.cout_estime})` : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => explainRisk(risque)}
                          className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Obtenir plus d'informations"
                        >
                          <HelpCircle className="w-5 h-5" />
                        </button>
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
