// src/components/duer/DUERWizard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { RiskMatrixEditor } from "../risks/RiskMatrixEditor";
import { QuestionFlow, Question } from "../flow/QuestionFlow";
import { Risk, UniteTravail, DuerDoc } from "../../types/duer.types";
import { AuditPanel } from "./AuditPanel";
import { probToLabel, gravToLabel, calculerHierarchie, hierToGlyph } from "../../utils/carsat";
import { computeBudgetDetails } from "../../utils/budget";
import CarsatLegend from "./CarsatLegend";
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
type IAQuestion = {
  id: string;
  question: string;
  type: "oui_non" | "texte";
  showIf?: { qid: string; equals: string }[];
  category?: string[];
  importance?: "urgent" | "important" | "complementaire";
  priority?: number;
};

interface DUERGenerateResponse {
  success: boolean;
  duerId?: string;
  warning?: string;
  duer?: { duer: DuerDoc } | DuerDoc; // on tolère les deux formes rencontrées
  error?: string;
}

interface IAQuestionsResponse {
  questions: IAQuestion[];
  queue?: { complementary: IAQuestion[] };
  remaining_important_estimate?: number;
  warning?: string;
}

/** ---------- Helpers & API ---------- */
const API_BASE = import.meta.env?.VITE_API_URL ?? "http://localhost:5001";

function getToken(): string | null {
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
  const timeoutMs = 75000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (text) {
      try { console.warn("API error payload:", JSON.parse(text)); } catch { console.warn("API error text:", text); }
    }
    let payload: any = null;
    try { payload = text ? JSON.parse(text) : null; } catch {}
    const message =
      payload?.error || payload?.message || `HTTP ${res.status} ${res.statusText || ""}`;
    throw new Error(message);
  }
  return (await res.json()) as T;
}

function normalizeDuer(doc: DuerDoc): DuerDoc {
  return {
    ...doc,
    unites: doc.unites.map((u: UniteTravail, uIdx: number) => ({
      ...u,
      id: (u as any).id ?? `U${uIdx}-${u.nom}`,
      risques: u.risques.map((r: Risk, rIdx: number) => ({
        ...r,
        id: (r as any).id ?? `R${uIdx}-${rIdx}-${r.danger}-${r.situation}`,
      })),
    })),
  };
}

async function loadDUERById(id: string): Promise<DuerDoc> {
  const data = await apiFetch<any>(`/api/duer/${id}`, { method: "GET" });
  if (!data?.duer) throw new Error("Format de réponse inattendu");
  const doc = data.duer.duer || data.duer;
  return normalizeDuer(doc);
}

export async function patchDUER(id: string, ops: any[]) {
  return apiFetch(`/api/duer/${id}/patch`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ops }),
  });
}

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

function priorityPillClass(priority: number) {
  if (priority >= 12) return "text-red-600 bg-red-50";
  if (priority >= 8) return "text-orange-600 bg-orange-50";
  if (priority >= 4) return "text-yellow-600 bg-yellow-50";
  return "text-green-600 bg-green-50";
}

function probabilityLabel(p: number) { return probToLabel(p); }
function gravityLabel(level: number) { return gravToLabel(level); }

const calculateRisqueNet = (risque: any) => {
  const prio = risque.priorite || (risque.gravite * risque.probabilite);
  const maitrise = risque.maitrise as 'TRES_BONNE' | 'BONNE' | 'PARTIELLE' | 'AUCUNE' | undefined;
  const facteur = maitrise === 'TRES_BONNE' ? 0.9 :
                  maitrise === 'BONNE' ? 0.7 :
                  maitrise === 'PARTIELLE' ? 0.5 : 0;
  return Math.ceil(prio * (1 - facteur));
};

// Fusion sans doublons (par id et par texte)
function nextQuestionId(existing: string[]) {
  let n = existing.length + 1;
  let id = `Q${n}`;
  while (existing.includes(id)) { n += 1; id = `Q${n}`; }
  return id;
}
function makeUniqueQuestions(existing: Question[], incoming: Question[]): Question[] {
  const byText = new Set(existing.map(q => q.question.trim().toLowerCase()));
  const ids = new Set(existing.map(q => q.id));
  const result: Question[] = [];
  for (const q of incoming) {
    const textKey = q.question.trim().toLowerCase();
    if (byText.has(textKey)) continue;
    let id = q.id?.trim() || "";
    if (!id || ids.has(id)) { id = nextQuestionId(Array.from(ids)); }
    ids.add(id);
    byText.add(textKey);
    result.push({ ...q, id });
  }
  return result;
}

/** ---------- Composant ---------- */
const DUERWizard: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState({
    sector: "",
    size: "TPE" as "TPE" | "PME" | "ETI",
    unites: [""],
    historique: "",
    contraintes: "",
    reponses: {} as Record<string, any>,
    weightProb: 1.0,
    weightGrav: 1.1,
    budgetSerre: false,
  });

  const [histList, setHistList] = useState<string[]>([""]);
  const [consList, setConsList] = useState<string[]>([""]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [generatedDUER, setGeneratedDUER] = useState<DuerDoc | null>(null);
  const [urgentIds, setUrgentIds] = useState<Set<string>>(new Set());
  const [complementaryQueue, setComplementaryQueue] = useState<Question[]>([]);
  const [remainingImportant, setRemainingImportant] = useState<number>(0);
  const [duerId, setDuerId] = useState<string | undefined>(undefined);

  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [riskExplanation, setRiskExplanation] = useState<{
    resume_simple: string;
    statistiques?: string;
    exemple_accident?: string;
    reference_principale?: string;
    conseil_pratique?: string;
  } | null>(null);

  const [showBudgetPanel, setShowBudgetPanel] = useState(false);
  const [tvaRate, setTvaRate] = useState<number>(0.2);
  const [subsidyRate, setSubsidyRate] = useState<number>(0.3);

  // Slot-filling (couverture + chargement)
  const [coverage, setCoverage] = useState(0);
  const [slotLoading, setSlotLoading] = useState(false);

  // Token présent ?
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Vous n'êtes pas connecté(e). Merci de vous authentifier avant de générer un DUER.");
    }
  }, []);

  // Hydrate listes depuis les champs textarea s'ils sont déjà remplis
  useEffect(() => {
    if (formData.historique) {
      const histItems = formData.historique.split("\n").map(s => s.replace(/^-\s*/, "").trim()).filter(Boolean);
      if (histItems.length > 0) setHistList(histItems);
    }
    if (formData.contraintes) {
      const consItems = formData.contraintes.split("\n").map(s => s.replace(/^-\s*/, "").trim()).filter(Boolean);
      if (consItems.length > 0) setConsList(consItems);
    }
  }, [formData.historique, formData.contraintes]);

  /** --------- Étape 1 : fetch questions IA --------- */
  const handleStep1Submit = async () => {
    try {
      setError("");
      if (!formData.sector.trim()) { setError("Veuillez renseigner le secteur d'activité."); return; }
      const filledUnits = formData.unites.map(u => u.trim()).filter(Boolean);
      if (filledUnits.length === 0) { setError("Veuillez saisir au moins une unité de travail."); return; }

      setLoading(true);

      await apiFetch<{ mistralConfigured: boolean }>("/api/status").then((s) => {
        if (!s.mistralConfigured) throw new Error("Le service IA n'est pas configuré côté serveur (clé absente).");
      });

      const histString = histList.filter(s => s.trim()).map(s => `- ${s.trim()}`).join("\n");
      const consString = consList.filter(s => s.trim()).map(s => `- ${s.trim()}`).join("\n");

      setFormData(prev => ({ ...prev, historique: histString, contraintes: consString }));

      const payload = {
        sector: formData.sector,
        size: formData.size,
        unites: filledUnits,
        weightProb: formData.weightProb,
        weightGrav: formData.weightGrav,
        historique: histList.filter(s => s.trim()),
        contraintes: consList.filter(s => s.trim()),
      };

      const data = await apiFetch<IAQuestionsResponse>("/api/duer/ia-questions-dynamic", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Marquer visuellement (prefixes)
      const mark = (q: IAQuestion, importance?: string) => {
        const prefix = importance === "complementaire" ? "🟡 Complémentaire — " : "🔴 Prioritaire — ";
        return {
          id: q.id,
          question: `${prefix}${q.question}`,
          type: (q.type === "oui_non" || q.type === "texte") ? q.type : "texte",
          showIf: q.showIf ? q.showIf.map(c => ({ qid: c.qid, equals: c.equals })) : undefined
        } as Question;
      };

      const urgent = (data?.questions || []).map(q => mark(q as any, (q as any).importance || "urgent"));
      const complementary = (data?.queue?.complementary || []).map(q => mark(q as any, "complementaire"));

      setQuestions(prev => makeUniqueQuestions(prev, urgent));
      setComplementaryQueue(complementary);
      setUrgentIds(new Set(urgent.map(q => q.id)));
      setRemainingImportant(Math.max(0, Number(data?.remaining_important_estimate || 0)));
      setStep(2);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la récupération des questions.");
    } finally {
      setLoading(false);
    }
  };

  /** --------- Étape 2 : slot-filling — next questions --------- */
  async function fetchNextQuestions() {
    setSlotLoading(true);
    try {
      const payload = {
        sector: formData.sector,
        size: formData.size,
        unites: formData.unites.filter(Boolean),
        historique: histList.filter(s => s.trim()),
        contraintes: consList.filter(s => s.trim()),
        asked: questions.map(q => ({ id: q.id, question: q.question })),
        answers: formData.reponses,
        coverageTarget: 0.85,
        maxNew: 6
      };
      const resp = await apiFetch<{
        questions: IAQuestion[];
        coverage: number;
        missing_reasons: string[];
        stop: boolean;
        meta: { detected_categories: string[] };
      }>("/api/duer/ia-questions-next", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      // Map IAQuestion -> Question (sans préfixer, on garde brut ici)
      const mapped: Question[] = (resp.questions || []).map(q => ({
        id: q.id,
        question: q.question,
        type: q.type === "oui_non" ? "oui_non" : "texte",
        showIf: q.showIf
      }));

      setQuestions(prev => makeUniqueQuestions(prev, mapped));
      setCoverage(resp.coverage || 0);
    } catch (e: any) {
      setError(e?.message || "Erreur slot-filling");
    } finally {
      setSlotLoading(false);
    }
  }

  /** --------- Étape 2 : suggestions de risques --------- */
  async function fetchRiskSuggestions() {
    try {
      setError("");
      const payload = {
        sector: formData.sector,
        units: formData.unites.filter(Boolean),
        historique: histList.filter(s => s.trim()),
        contraintes: consList.filter(s => s.trim()),
        reponses: formData.reponses
      };
      const res = await apiFetch<{ suggestions: any[] }>(
        "/api/duer/ia-suggest",
        { method: "POST", body: JSON.stringify(payload) }
      );
      alert(
        "Suggestions:\n\n" +
        (res.suggestions || [])
          .map((s: any) => `• [${s.unit}] ${s.danger} — ${s.situation} (prio ${s.priorite})`)
          .join("\n")
      );
    } catch (e: any) {
      setError(e?.message || "Impossible de récupérer les suggestions");
    }
  }

  /** --------- Étape 2 : valider réponses --------- */
  const allUrgentAnswered = useMemo(() => {
    if (!questions.length || urgentIds.size === 0) return true;
    return questions
      .filter(q => urgentIds.has(q.id))
      .every(q => {
        const v = formData.reponses[q.id];
        if (q.type === "oui_non") return v === "oui" || v === "non";
        return typeof v === "string" && v.trim().length > 0;
      });
  }, [questions, urgentIds, formData.reponses]);

  const handleStep2Submit = () => {
    if (!allUrgentAnswered || remainingImportant > 0) {
      const ok = window.confirm(
        !allUrgentAnswered
          ? "Certaines questions prioritaires ne sont pas renseignées. Continuer quand même ?"
          : `Il resterait ${remainingImportant} question(s) importante(s) à poser. Continuer quand même ?`
      );
      if (!ok) return;
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
      const histString = histList.filter(s => s.trim()).map(s => `- ${s.trim()}`).join("\n");
      const consString = consList.filter(s => s.trim()).map(s => `- ${s.trim()}`).join("\n");

      setFormData(prev => ({ ...prev, historique: histString, contraintes: consString }));

      const payload = {
        sector: formData.sector,
        size: formData.size,
        unites: filledUnits,
        historique: histList.filter(s => s.trim()),
        contraintes: consList.filter(s => s.trim()),
        reponses: formData.reponses || {},
        weightProb: formData.weightProb,
        weightGrav: formData.weightGrav,
        budgetSerre: formData.budgetSerre,
      };

      const res: any = await apiFetch("/api/duer/ia-generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      let doc: DuerDoc | null = null;
      let id: string | undefined = undefined;

      if (res?.success && (res?.duer || res?.duer?.duer)) {
        doc = (res.duer?.duer || res.duer) as DuerDoc;
        id = res.duerId;
      } else if (res?.duerId && !res?.duer) {
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
      if (e?.name === "AbortError") {
        setError("La génération a pris trop de temps. Réessayez ou réduisez la portée.");
      } else {
        setError(e?.message || "Erreur lors de la génération du DUER.");
      }
    } finally {
      setLoading(false);
    }
  };

  /** --------- Étape 4 : Explication d’un risque --------- */
  const explainRisk = async (risk: Risk) => {
    try {
      setSelectedRisk(risk);
      setRiskExplanation(null);
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
        setTimeout(() => {
          setRiskExplanation({
            resume_simple: `Le « ${risk.danger} » est fréquent dans ce contexte et peut générer des arrêts de travail.`,
            statistiques: "≈ 20–30% des AT liés au contexte évoqué (ordre de grandeur).",
            exemple_accident: "Ex.: glissade sur sol humide lors d'un déplacement.",
            reference_principale: "Code du travail — Principes généraux de prévention",
            conseil_pratique: "Former aux bons gestes/postures et entretenir les zones de circulation.",
          });
        }, 700);
      }
    } catch {
      setRiskExplanation({
        resume_simple: "Impossible de récupérer l’explication détaillée pour ce risque pour le moment.",
      });
    }
  };

  /** --------- Export PDF --------- */
  const handleExportPDF = async () => {
    if (!duerId) { setError("Export PDF indisponible (identifiant DUER manquant). Génère d'abord le DUER."); return; }
    try {
      setError("");
      setLoading(true);
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/duer/${duerId}/pdf`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Export PDF: HTTP ${res.status} ${res.statusText || ""}`);
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

  // Supprimer un risque
  const handleDeleteRisk = async (unitId: string, riskId: string) => {
    if (!duerId || !window.confirm("Êtes-vous sûr de vouloir supprimer ce risque ?")) return;
    try {
      await patchDUER(duerId, [{ op: "remove_risk", unitId, riskId }]);
      if (generatedDUER) {
        const updatedUnites = generatedDUER.unites.map(unit =>
          ((unit as any).id === unitId || unit.nom === unitId)
            ? { ...unit, risques: unit.risques.filter((r: Risk) => (r as any).id !== riskId) }
            : unit
        );
        setGeneratedDUER({ ...generatedDUER, unites: updatedUnites });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression du risque");
    }
  };

  /** ---------- Rendu ---------- */
  return (
    <>
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
                    {step > (s as any) ? <CheckCircle2 className="w-5 h-5" /> : s}
                  </div>
                  {s < 4 && (
                    <div className={`w-24 h-1 ${step > (s as any) ? "bg-blue-600" : "bg-gray-200"}`} />
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
            <CarsatLegend className="mt-4" />
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
              <h3 className="text-lg font-semibold mb-4">Informations sur votre entreprise</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Secteur d'activité</label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Ex: BTP, Restauration, Industrie..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Taille de l'entreprise</label>
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
                    onChange={(prob, grav) => setFormData({ ...formData, weightProb: prob, weightGrav: grav })}
                  />
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.budgetSerre}
                        onChange={(e) => setFormData({ ...formData, budgetSerre: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Budget serré (prioriser alternatives low-cost)</p>
                    <p className="text-xs text-gray-500">Activez pour privilégier des solutions plus économiques dans les mesures proposées.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Unités de travail</label>
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
                            setFormData({ ...formData, unites: newUnits.length ? newUnits : [""] });
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
                    Une ligne par élément (physique, psychologique, matériel ou organisationnel).
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
                          placeholder="Ex: salles inadaptées, subventions limitées, ..."
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
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* Étape 2 : Questions IA */}
          {step === 2 && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Questions pour affiner votre DUER</h3>

              {/* Jauge de couverture + actions */}
              <div className="mb-4 p-3 rounded-lg bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-sm text-gray-700">
                  Couverture estimée : <strong>{Math.round(coverage * 100)}%</strong> —{" "}
                  {coverage >= 0.85
                    ? "vous pouvez générer le DUER en confiance."
                    : "vous pouvez améliorer la précision en posant d’autres questions."}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchNextQuestions}
                    disabled={slotLoading}
                    className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    title="L’IA propose des questions de précision ciblées"
                  >
                    {slotLoading ? "Recherche..." : "Poser d'autres questions"}
                  </button>
                  <button
                    onClick={fetchRiskSuggestions}
                    className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    title="Voir des risques plausibles souvent oubliés"
                  >
                    Voir des risques oubliés
                  </button>
                </div>
              </div>

              <div className="mb-3 text-sm text-gray-700">
                {remainingImportant > 0
                  ? `ℹ️ L'IA estime qu'il resterait ~${remainingImportant} question(s) importante(s) à poser.`
                  : `✅ Vous avez couvert les questions prioritaires proposées.`}
              </div>

              {/* Ajout local depuis la file complémentaire (optionnel) */}
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-600">
                  L'IA a généré ces questions pour mieux comprendre vos risques spécifiques.
                </p>
                <button
                  onClick={() => {
                    if (!complementaryQueue.length) return;
                    const take = complementaryQueue.slice(0, 3);
                    const rest = complementaryQueue.slice(3);
                    setQuestions(prev => makeUniqueQuestions(prev, take));
                    setComplementaryQueue(rest);
                    if (remainingImportant > 0) setRemainingImportant(Math.max(0, remainingImportant - take.length));
                  }}
                  disabled={loading || complementaryQueue.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Afficher d'autres questions importantes
                </button>
              </div>

              <QuestionFlow
                questions={questions}
                values={formData.reponses}
                onChange={(id, val) =>
                  setFormData(prev => ({ ...prev, reponses: { ...prev.reponses, [id]: val } }))
                }
              />

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Retour
                </button>
                <button
                  onClick={handleStep2Submit}
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
              <h3 className="text-lg font-semibold mb-4">Prêt à générer votre DUER</h3>

              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <p className="text-gray-700 mb-4">
                  L'IA va analyser vos informations et générer un DUER personnalisé incluant :
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
                    <div className="text-sm text-gray-600">Risques importants</div>
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
                    <button
                      type="button"
                      className="mt-2 text-xs text-blue-700 underline"
                      onClick={() => setShowBudgetPanel(true)}
                      title="Voir le détail et ajuster TVA/aides"
                    >
                      Voir le détail
                    </button>
                  </div>
                </div>
              </div>

              {/* Audit IA */}
              {duerId && (
                <div className="mb-6">
                  <AuditPanel duerId={duerId} />
                </div>
              )}

              {/* Unités & risques */}
              {generatedDUER.unites.map((unite: UniteTravail, uniteIdx: number) => (
                <div key={(unite as any).id || `unite-${uniteIdx}-${unite.nom}`} className="mb-6">
                  <h4 className="font-semibold mb-3 text-lg">{unite.nom}</h4>

                  <div className="space-y-3">
                    {unite.risques.map((risque: Risk, risqueIdx: number) => (
                      <div
                        key={(risque as any).id || `${(unite as any).id || `unite-${uniteIdx}-${unite.nom}`}-risque-${risqueIdx}-${risque.danger}-${risque.situation}`}
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
                              {(() => {
                                const pL = probToLabel(risque.probabilite);
                                const gL = gravToLabel(risque.gravite);
                                const h = calculerHierarchie(pL, gL);
                                return (
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${priorityPillClass(risque.priorite)}`}
                                    title={`Probabilité: ${pL} | Gravité: ${gL}`}
                                  >
                                    Hiérarchie: {hierToGlyph(h)} ({h})
                                  </span>
                                );
                              })()}
                            </div>

                            <p className="text-sm text-gray-600 mb-2">{risque.situation}</p>

                            <div className="flex gap-4 text-sm">
                              <span>Gravité: <strong>{gravityLabel(risque.gravite)}</strong></span>
                              <span>Probabilité: <strong>{probabilityLabel(risque.probabilite)}</strong></span>
                              <span className="text-gray-500">(priorité interne {risque.priorite})</span>
                            </div>

                            {/* Brut & Net */}
                            <div className="flex gap-4 text-sm mt-1">
                              <span>Risque brut: <strong>{risque.priorite}</strong></span>
                              <span>Maîtrise: <strong>{(risque as any).maitrise || "—"}</strong></span>
                              <span>Risque net: <strong>{calculateRisqueNet(risque)}</strong></span>
                              <span>Effectifs exposés: <strong>{(risque as any).effectifs_concernes ?? "—"}</strong></span>
                              <span>Pénibilité: <strong>{(risque as any).penibilite === true ? "Oui" : ((risque as any).penibilite === false ? "Non" : "—")}</strong></span>
                            </div>

                            {Array.isArray((risque as any).mesures_proposees) && (risque as any).mesures_proposees.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm font-medium mb-1">Mesures proposées:</p>
                                <ul className="text-sm text-gray-600 list-disc list-inside">
                                  {(risque as any).mesures_proposees.map((m: any, idx: number) => (
                                    <li key={`${(risque as any).id}-${idx}-${m.description}`}>
                                      {m.description}{m.cout_estime ? ` (${m.cout_estime})` : ""}
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
                                  onClick={() =>
                                    handleDeleteRisk(
                                      ((unite as any).id || unite.nom) as string,
                                      ((risque as any).id || `${unite.nom}-${risque.danger}-${risque.situation}`) as string
                                    )
                                  }
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Supprimer ce risque"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                                <details className="w-56">
                                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">Modifier</summary>
                                  <div className="mt-2 p-2 border rounded-lg bg-gray-50">
                                    <label className="block text-xs text-gray-600">Gravité (1..4)</label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={4}
                                      defaultValue={risque.gravite}
                                      className="w-full border rounded px-2 py-1 text-sm mb-2"
                                      onChange={(e) => ((risque as any).gravite = Number(e.target.value))}
                                    />
                                    <label className="block text-xs text-gray-600">Probabilité (1..4)</label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={4}
                                      defaultValue={risque.probabilite}
                                      className="w-full border rounded px-2 py-1 text-sm mb-2"
                                      onChange={(e) => ((risque as any).probabilite = Number(e.target.value))}
                                    />

                                    <label className="block text-xs text-gray-600 mt-2">Maîtrise</label>
                                    <select
                                      defaultValue={(risque as any).maitrise || "AUCUNE"}
                                      className="w-full border rounded px-2 py-1 text-sm mb-2"
                                      onChange={(e) => ((risque as any).maitrise = e.target.value as any)}
                                    >
                                      {["AUCUNE","PARTIELLE","BONNE","TRES_BONNE"].map(x =>
                                        <option key={x} value={x}>{x.replace(/_/g, " ")}</option>
                                      )}
                                    </select>

                                    <label className="block text-xs text-gray-600">Effectifs concernés</label>
                                    <input
                                      type="number"
                                      min={0}
                                      defaultValue={(risque as any).effectifs_concernes ?? ""}
                                      className="w-full border rounded px-2 py-1 text-sm mb-2"
                                      onChange={(e) => ((risque as any).effectifs_concernes = e.target.value ? Number(e.target.value) : null)}
                                    />

                                    <label className="block text-xs text-gray-600">Pénibilité</label>
                                    <select
                                      defaultValue={(risque as any).penibilite === true ? "oui" : ((risque as any).penibilite === false ? "non" : "")}
                                      className="w-full border rounded px-2 py-1 text-sm mb-2"
                                      onChange={(e) => ((risque as any).penibilite = e.target.value === "" ? null : e.target.value === "oui")}
                                    >
                                      <option value="">—</option>
                                      <option value="oui">Oui</option>
                                      <option value="non">Non</option>
                                    </select>

                                    <label className="block text-xs text-gray-600">Date de décision</label>
                                    <input
                                      type="date"
                                      defaultValue={(risque as any).suivi?.date_decision || ""}
                                      className="w-full border rounded px-2 py-1 text-sm mb-2"
                                      onChange={(e) => ((risque as any).suivi = { ...((risque as any).suivi||{}), date_decision: e.target.value })}
                                    />

                                    <label className="block text-xs text-gray-600">Réalisé le</label>
                                    <input
                                      type="date"
                                      defaultValue={(risque as any).suivi?.realise_le || ""}
                                      className="w-full border rounded px-2 py-1 text-sm mb-2"
                                      onChange={(e) => ((risque as any).suivi = { ...((risque as any).suivi||{}), realise_le: e.target.value })}
                                    />

                                    <button
                                      className="w-full px-2 py-1 bg-blue-600 text-white rounded text-sm"
                                      onClick={async () => {
                                        try {
                                          await patchDUER(duerId!, [
                                            {
                                              op: "edit_risk",
                                              unitId: ((unite as any).id || unite.nom) as string,
                                              riskId: ((risque as any).id || `${unite.nom}-${risque.danger}-${risque.situation}`) as string,
                                              data: { gravite: (risque as any).gravite, probabilite: (risque as any).probabilite }
                                            },
                                            {
                                              op: "edit_maitrise",
                                              unitId: ((unite as any).id || unite.nom) as string,
                                              riskId: ((risque as any).id || `${unite.nom}-${risque.danger}-${risque.situation}`) as string,
                                              maitrise: ((risque as any).maitrise as any) || "AUCUNE"
                                            },
                                            {
                                              op: "edit_effectifs",
                                              unitId: ((unite as any).id || unite.nom) as string,
                                              riskId: ((risque as any).id || `${unite.nom}-${risque.danger}-${risque.situation}`) as string,
                                              effectifs: (risque as any).effectifs_concernes ?? null
                                            },
                                            {
                                              op: "toggle_penibilite",
                                              unitId: ((unite as any).id || unite.nom) as string,
                                              riskId: ((risque as any).id || `${unite.nom}-${risque.danger}-${risque.situation}`) as string,
                                              value: (risque as any).penibilite as any
                                            },
                                            {
                                              op: "set_dates",
                                              unitId: ((unite as any).id || unite.nom) as string,
                                              riskId: ((risque as any).id || `${unite.nom}-${risque.danger}-${risque.situation}`) as string,
                                              date_decision: (risque as any).suivi?.date_decision,
                                              realise_le: (risque as any).suivi?.realise_le
                                            }
                                          ]);
                                          // Recalcul local
                                          const g = Number((risque as any).gravite) || 1;
                                          const p = Number((risque as any).probabilite) || 1;
                                          const f = (risque as any).maitrise === "TRES_BONNE" ? 0.9 :
                                                    (risque as any).maitrise === "BONNE" ? 0.7 :
                                                    (risque as any).maitrise === "PARTIELLE" ? 0.5 : 0;
                                          (risque as any).priorite = g * p;
                                          (risque as any).risque_net = Math.ceil(g * p * (1 - f));
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
                      onClick={() => { setSelectedRisk(null); setRiskExplanation(null); }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {riskExplanation ? (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Résumé simple</h5>
                        <p className="text-sm">{riskExplanation.resume_simple}</p>
                      </div>
                      {riskExplanation.statistiques && (
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Statistiques</h5>
                          <p className="text-sm">{riskExplanation.statistiques}</p>
                        </div>
                      )}
                      {riskExplanation.exemple_accident && (
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Exemple concret</h5>
                          <p className="text-sm">{riskExplanation.exemple_accident}</p>
                        </div>
                      )}
                      {riskExplanation.reference_principale && (
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Référence réglementaire</h5>
                          <p className="text-sm font-mono bg-gray-100 p-2 rounded">{riskExplanation.reference_principale}</p>
                        </div>
                      )}
                      {riskExplanation.conseil_pratique && (
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Conseil pratique</h5>
                          <p className="text-sm bg-blue-50 p-3 rounded">💡 {riskExplanation.conseil_pratique}</p>
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

      {/* Panneau latéral Budget détaillé — visible à l'étape 4 */}
      {showBudgetPanel && generatedDUER && (
        <div className="fixed inset-y-0 right-0 w-[28rem] bg-white shadow-2xl p-6 overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Budget détaillé</h4>
            <button onClick={() => setShowBudgetPanel(false)} className="p-1 hover:bg-gray-100 rounded" aria-label="Fermer le détail budget">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-gray-600">TVA (%)</span>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={Math.round(tvaRate * 100)}
                  onChange={(e) => setTvaRate(Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100)}
                  min={0}
                  max={100}
                />
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-600">Taux d'aide/subvention estimé (%)</span>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={Math.round(subsidyRate * 100)}
                  onChange={(e) => setSubsidyRate((Number(e.target.value) || 0) / 100)}
                  className="w-full"
                />
                <div className="text-xs text-gray-700 mt-1">{Math.round(subsidyRate * 100)}%</div>
              </div>
            </div>

            {(() => {
              const det = computeBudgetDetails(generatedDUER, { tvaRate, subsidyRate });
              return (
                <>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="flex items-center justify-between text-sm">
                      <span>Mesures (base)</span><strong>{det.totals.base.label}</strong>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>+ TVA</span><strong>{det.totals.withTVA.label}</strong>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>– Subventions (estimation)</span><strong>{det.totals.netSubsidy.label}</strong>
                    </div>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-gray-700">Voir le détail par mesure</summary>
                    <div className="mt-2 max-h-72 overflow-auto border rounded">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left p-2">Unité</th>
                            <th className="text-left p-2">Mesure</th>
                            <th className="text-left p-2">Type</th>
                            <th className="text-left p-2">Délai</th>
                            <th className="text-right p-2">Min</th>
                            <th className="text-right p-2">Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {det.lines.map((l, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{l.unit}</td>
                              <td className="p-2">{l.measure}</td>
                              <td className="p-2">{l.type || "—"}</td>
                              <td className="p-2">{l.delai || "—"}</td>
                              <td className="p-2 text-right">{Math.round(l.min)}</td>
                              <td className="p-2 text-right">{Math.round(l.max)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>

                  <p className="text-[11px] text-gray-500">
                    ⚖️ Montants estimatifs calculés sur les mesures DUER uniquement. Ajustez la TVA et un taux d'aide/subvention pour simuler votre cas.
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
};

export default DUERWizard;
