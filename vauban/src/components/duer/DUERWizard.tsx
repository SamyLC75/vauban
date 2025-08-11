import React, { useEffect, useMemo, useState } from "react";
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
import { DUERRisk, DUERUnit, Question, DUER } from "../../types";

/**
 * Clean rewrite of DUERWizard
 * - Avoids direct localStorage access during render
 * - Consolidates API calls & error handling
 * - Stronger typing
 * - Removes duplicated JSX blocks
 * - Small UI/UX improvements (disabled buttons, guards)
 */

interface FormData {
  sector: string;
  size: "TPE" | "PME" | "ETI";
  unites: string[];
  historique: string;
  contraintes: string;
  reponses: Record<string, string>;
  username: string;
  password: string;
}

const DEFAULT_FORM: FormData = {
  sector: "",
  size: "PME",
  unites: [""],
  historique: "",
  contraintes: "",
  reponses: {},
  username: "",
  password: "",
};

export default function DUERWizard() {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);

  // Check token validity on mount
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setStep(0);
    }
  }, []);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [generatedDUER, setGeneratedDUER] = useState<{
    duer: DUER;
    duerId: string;
    success: boolean;
    debug?: {
      modelUsed: string;
      promptLength: number;
      responseLength: number;
    };
    warning?: string;
  } | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<DUERRisk | null>(null);
  const [riskExplanation, setRiskExplanation] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // —————————————————————————————————————————————
  // Config
  // Prefer env var; fallback to localhost for dev
  const API_BASE = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000",
    []
  );

  // —————————————————————————————————————————————
  // Auth bootstrap
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
  }, []);

  const saveToken = (t: string) => {
    localStorage.setItem("token", t);
    setToken(t);
  };

  // —————————————————————————————————————————————
  // Helpers UI
  const getPriorityColor = (priority: number) => {
    if (priority >= 12) return "text-red-600 bg-red-50";
    if (priority >= 8) return "text-orange-600 bg-orange-50";
    if (priority >= 4) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const getGravityLabel = (level: number) => {
    const labels = ["", "Faible", "Modérée", "Grave", "Très grave"];
    return labels[level] || "";
  };

  // —————————————————————————————————————————————
  // API
  const apiFetch = async (path: string, init?: RequestInit) => {
    if (!token) {
      setStep(0); // Redirect to login if not authenticated
      throw new Error("Non authentifié");
    }
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      let msg = "Erreur inconnue";
      try {
        const data = await res.json();
        msg = data?.error || data?.message || msg;
      } catch (_) {
        // ignore JSON parse errors
      }
      throw new Error(msg);
    }
    return res.json();
  };

  // —————————————————————————————————————————————
  // Actions
  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formData.username, password: formData.password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Échec de connexion");
      }
      const data = await res.json();
      saveToken(data.token);
      setFormData((prev) => ({ ...prev, username: "", password: "" }));
    } catch (e: any) {
      setError(`Erreur lors de la connexion : ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  // Étape 1 → récupérer questions
  const handleStep1Submit = async () => {
    if (!localStorage.getItem('token')) {
      setError("Veuillez vous connecter d'abord");
      return;
    }

    if (!formData.sector || formData.unites.filter(Boolean).length === 0) {
      setError("Veuillez remplir le secteur et au moins une unité");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // 1) Vérifier le statut backend (clé Mistral etc.)
      const status = await apiFetch("/api/status", { method: "GET" });
      if (!status?.mistralConfigured) {
        setError("Le service IA n'est pas configuré correctement. Contactez l'administrateur.");
        return;
      }

      // 2) Demander les questions
      const data = await apiFetch("/duer/ia-questions", {
        method: "POST",
        body: JSON.stringify({
          sector: formData.sector,
          unites: formData.unites.filter(Boolean),
        }),
      });

      setQuestions(data.questions || []);
      setStep(2);
    } catch (e: any) {
      setError(`Erreur lors de la génération des questions : ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 → simplement avancer
  const handleStep2Submit = () => setStep(3);

  // Étape 3 → générer DUER
  const generateDUER = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/duer/ia-generate", {
        method: "POST",
        body: JSON.stringify({
          sector: formData.sector,
          size: formData.size,
          unites: formData.unites.filter(Boolean),
          historique: formData.historique,
          contraintes: formData.contraintes,
          reponses: formData.reponses,
        }),
      });
      
      if (!response?.success || !response?.duer) {
        throw new Error('Réponse invalide du serveur');
      }
      
      setGeneratedDUER(response);
      setStep(4);
    } catch (e: any) {
      setError(`Erreur lors de la génération du DUER : ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  // Pane d'explication (mock)
  const explainRisk = async (risk: DUERRisk) => {
    setSelectedRisk(risk);
    setRiskExplanation(null);
    // Simule un appel API
    setTimeout(() => {
      setRiskExplanation({
        explication: {
          resume_simple: `Le "${risk.danger}" est un risque fréquent qui peut entraîner des arrêts de travail prolongés.`,
          statistiques: "25% des accidents du travail dans les bureaux",
          exemple_accident: "Un collaborateur s'est blessé au dos en soulevant une imprimante",
          reference_principale: "Code du travail - Principes généraux de prévention",
          conseil_pratique: "Former le personnel aux bons gestes et postures",
        },
      });
    }, 900);
  };

  // —————————————————————————————————————————————
  // Render
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Générateur DUER avec IA
          </h2>

          {/* Progression */}
          <div className="mt-4 flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step > (s as 1 | 2 | 3 | 4) ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                {s < 4 && <div className={`w-24 h-1 ${step > s ? "bg-blue-600" : "bg-gray-200"}`} />}
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

        {/* Login */}
        {!token && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Connexion requise</h3>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
                <input
                  type="text"
                  placeholder="Samy ou Takaya"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleLogin}
                disabled={loading || !formData.username || !formData.password}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Se connecter
              </button>
            </div>
          </div>
        )}

        {/* Étape 1 */}
        {step === 1 && token && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Informations sur votre entreprise</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secteur d'activité</label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  placeholder="Ex: Commerce de détail, BTP, Services informatiques..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taille de l'entreprise</label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value as FormData["size"] })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TPE">TPE (1-10 salariés)</option>
                  <option value="PME">PME (10-250 salariés)</option>
                  <option value="ETI">ETI (250-5000 salariés)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unités de travail</label>
                {formData.unites.map((unite, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={unite}
                      onChange={(e) => {
                        const newUnites = [...formData.unites];
                        newUnites[index] = e.target.value;
                        setFormData({ ...formData, unites: newUnites });
                      }}
                      placeholder="Ex: Bureau, Atelier, Entrepôt..."
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, unites: [...formData.unites, ""] })}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      +
                    </button>
                    {formData.unites.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            unites: formData.unites.filter((_, i) => i !== index),
                          })
                        }
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        −
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Historique d'accidents (optionnel)</label>
                <textarea
                  value={formData.historique}
                  onChange={(e) => setFormData({ ...formData, historique: e.target.value })}
                  placeholder="Décrivez brièvement les accidents survenus..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleStep1Submit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Étape 2 */}
        {step === 2 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Questions pour affiner votre DUER</h3>
            <p className="text-gray-600 mb-6">L'IA a généré ces questions pour mieux comprendre vos risques spécifiques</p>

            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium">{q.question}</p>
                      {q.justification ? <p className="text-sm text-gray-600 mt-1">{q.justification}</p> : null}

                      {q.type === "oui_non" && (
                        <div className="mt-3 flex gap-4">
                          {(["oui", "non"] as const).map((val) => (
                            <label key={val} className="flex items-center">
                              <input
                                type="radio"
                                name={q.id}
                                value={val}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    reponses: { ...prev.reponses, [q.id]: e.target.value },
                                  }))
                                }
                                className="mr-2"
                              />
                              {val.toUpperCase()}
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === "texte" && (
                        <input
                          type="text"
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              reponses: { ...prev.reponses, [q.id]: e.target.value },
                            }))
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
              <button onClick={() => setStep(1)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Retour
              </button>
              <button onClick={handleStep2Submit} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 */}
        {step === 3 && (
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-4">Prêt à générer votre DUER</h3>
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <p className="text-gray-700 mb-4">L'IA va maintenant analyser vos informations et générer un DUER personnalisé incluant :</p>
              <ul className="text-left max-w-md mx-auto space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" /> Identification des risques par unité
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" /> Évaluation gravité/probabilité
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" /> Mesures de prévention adaptées
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" /> Plan d'actions prioritaires
                </li>
              </ul>
            </div>

            <button
              onClick={generateDUER}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Génération en cours...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" /> Générer mon DUER
                </>
              )}
            </button>
          </div>
        )}

        {/* Étape 4 */}
        {step === 4 && generatedDUER && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Votre DUER généré</h3>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Exporter PDF
              </button>
            </div>

            {/* Synthèse */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-3">Synthèse</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{generatedDUER?.duer.synthese?.nb_risques_critiques}</div>
                  <div className="text-sm text-gray-600">Risques critiques</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{generatedDUER?.duer.synthese?.nb_risques_importants}</div>
                  <div className="text-sm text-gray-600">Risques importants</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{generatedDUER?.duer.synthese?.nb_risques_moderes}</div>
                  <div className="text-sm text-gray-600">Risques modérés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{generatedDUER?.duer?.synthese?.budget_prevention_estime}</div>
                  <div className="text-sm text-gray-600">Budget prévention</div>
                </div>
              </div>
            </div>
            {/* Risques par unité */}
            {generatedDUER?.duer.unites.map((unite: DUERUnit) => (
              <div key={unite.nom} className="mb-6">
                <h4 className="font-semibold mb-3 text-lg">{unite.nom}</h4>
                <div className="space-y-3">
                  {unite.risques.map((risque) => (
                    <div key={risque.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
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
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(risque.priorite)}`}>
                              Priorité: {risque.priorite}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-2">{risque.situation}</p>
                          <div className="flex gap-4 text-sm">
                            <span>
                              Gravité: <strong>{getGravityLabel(risque.gravite)}</strong>
                            </span>
                            <span>
                              Probabilité: <strong>{risque.probabilite}/4</strong>
                            </span>
                          </div>
                          {risque.mesures_proposees?.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm font-medium mb-1">Mesures proposées:</p>
                              <ul className="text-sm text-gray-600 list-disc list-inside">
                                {risque.mesures_proposees.map((mesure, idx) => (
                                  <li key={idx}>
                                    {mesure.description} ({mesure.cout_estime})
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

            {/* Panel d'explication */}
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
                    <X className="w-5 h-5" />   
                  </button>
                </div>
                {riskExplanation ? (
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Résumé simple</h5>
                      <p className="text-sm">{riskExplanation.explication.resume_simple}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Statistiques</h5>
                      <p className="text-sm">{riskExplanation.explication.statistiques}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Exemple concret</h5>
                      <p className="text-sm">{riskExplanation.explication.exemple_accident}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Référence réglementaire</h5>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded">{riskExplanation.explication.reference_principale}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Conseil pratique</h5>
                      <p className="text-sm bg-blue-50 p-3 rounded">💡 {riskExplanation.explication.conseil_pratique}</p>
                    </div>
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
}