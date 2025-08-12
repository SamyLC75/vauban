// vauban-frontend/src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Header } from "../components/layout/Header";
import Badge from "../components/ui/Badge";
import { useNavigate, Link } from "react-router-dom";
import { FileText } from "lucide-react";

/* ---- Helpers API (token + fetch JSON) ---- */
const API_BASE =
  (import.meta as any).env?.VITE_REACT_APP_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "http://localhost:5000";

function getToken(): string | null {
  return localStorage.getItem("vauban_token") || localStorage.getItem("token") || null;
}

async function apiJson<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers || {}),
  };
  const res = await fetch(`${API_BASE}/api${path}`, { ...init, headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const Dashboard = () => {
  const navigate = useNavigate();

  /* ---- Alerts (existant) ---- */
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // ✅ Une seule déclaration de sendAlert
  const sendAlert = () => {
    const newAlert = {
      id: Date.now(),
      type: "urgence",
      message: "Alerte test",
      time: new Date().toLocaleTimeString("fr-FR"),
      sender: "Napoléon",
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setShowAlertModal(false);
  };

  /* ---- “Mes DUER” ---- */
  const [duers, setDuers] = useState<
    Array<{
      id: string;
      secteur: string;
      dateCreation: string;
      date_generation: string;
      unitesCount: number;
      crit: number;
      imp: number;
      mod: number;
    }>
  >([]);
  const [loadingDuers, setLoadingDuers] = useState(false);
  const [duerPreview, setDuerPreview] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingDuers(true);
        const data = await apiJson<{ items: any[] }>("/duer");
        setDuers(data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDuers(false);
      }
    };
    load();
  }, []);

  const handleView = async (id: string) => {
    try {
      const data = await apiJson(`/duer/${id}`);
      setDuerPreview(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePdf = async (id: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/duer/${id}/pdf`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(`PDF HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DUER_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement ce DUER ?")) return;
    try {
      await apiJson(`/duer/${id}`, { method: "DELETE" });
      setDuers((prev) => prev.filter((d) => d.id !== id));
      if (duerPreview?.id === id) setDuerPreview(null);
    } catch (e) {
      console.error(e);
    }
  };

  /* ---- Données d’affichage existantes ---- */
  const teamMembers = [
    { id: 1, name: "Napoléon", status: "safe", role: "Directeur" },
    { id: 2, name: "Molière", status: "safe", role: "RH" },
    { id: 3, name: "Voltaire", status: "unknown", role: "IT" },
    { id: 4, name: "Hugo", status: "safe", role: "Commercial" },
  ];

  const modules = [
    { label: "Analyse des risques (DUER)", done: true, to: "/risques" },
    { label: "PCA (Plan de Continuité)", done: true, to: "/pca" },
    { label: "Plan d'actions de prévention", done: false, to: "/actions" },
    { label: "Export PDF sécurisé", done: false, to: "/pdf" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* MODULES PRINCIPAUX */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Avancement des modules clés</h2>
            <div className="flex flex-col gap-3">
              {modules.map((m, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-60">{m.label}</span>
                  <Badge color={m.done ? "blue" : "yellow"}>
                    {m.done ? "Complété" : "À compléter"}
                  </Badge>
                  <Button onClick={() => navigate(m.to)}>Accéder</Button>
                </div>
              ))}
            </div>
          </div>

          {/* TEAM STATUS */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Statut de l’équipe</h2>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="text-center p-4 rounded-lg border-2 border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div
                    className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl mb-2 ${
                      member.status === "safe"
                        ? "bg-green-100"
                        : member.status === "danger"
                        ? "bg-red-100"
                        : "bg-gray-100"
                    }`}
                  >
                    {member.status === "safe"
                      ? "✅"
                      : member.status === "danger"
                      ? "🚨"
                      : "❓"}
                  </div>
                  <h3 className="font-medium">{member.name}</h3>
                  <p className="text-sm text-gray-600">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ALERTES */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Alertes récentes</h2>
          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune alerte</p>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-red-900">{alert.message}</p>
                      <p className="text-sm text-red-600">Par {alert.sender}</p>
                    </div>
                    <span className="text-xs text-gray-600">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button variant="danger" onClick={() => setShowAlertModal(true)} fullWidth>
              🚨 Déclencher une alerte
            </Button>
            <Button variant="primary" onClick={() => navigate("/risques")} fullWidth>
              📋 Analyse des risques
            </Button>
            <Button variant="primary" onClick={() => navigate("/pca")} fullWidth>
              🛡️ PCA
            </Button>
            <Button variant="primary" onClick={() => navigate("/actions")} fullWidth>
              ✅ Plan d’actions
            </Button>
            <Link
              to="/duer"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 w-full"
            >
              <FileText className="w-5 h-5" />
              Générer mon DUER
            </Link>
          </div>
        </div>

        {/* MES DUER */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Mes DUER</h2>
            <Link
              to="/duer"
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
            >
              + Nouveau DUER
            </Link>
          </div>

          {loadingDuers ? (
            <p className="text-gray-500">Chargement…</p>
          ) : duers.length === 0 ? (
            <p className="text-gray-500">Aucun DUER pour l’instant. Lancez-en un !</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4">Secteur</th>
                    <th className="py-2 pr-4">Créé le</th>
                    <th className="py-2 pr-4">Unités</th>
                    <th className="py-2 pr-4">Crit./Imp./Mod.</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {duers.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="py-2 pr-4">{d.secteur}</td>
                      <td className="py-2 pr-4">
                        {new Date(d.dateCreation).toLocaleString("fr-FR")}
                      </td>
                      <td className="py-2 pr-4">{d.unitesCount}</td>
                      <td className="py-2 pr-4">
                        <span className="text-red-600 font-medium">{d.crit}</span>{" "}
                        /{" "}
                        <span className="text-orange-600 font-medium">{d.imp}</span>{" "}
                        /{" "}
                        <span className="text-yellow-600 font-medium">{d.mod}</span>
                      </td>
                      <td className="py-2 pr-4 flex gap-2">
                        <button
                          onClick={() => handleView(d.id)}
                          className="px-2 py-1 border rounded hover:bg-gray-50"
                          title="Aperçu rapide"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => handlePdf(d.id)}
                          className="px-2 py-1 border rounded hover:bg-gray-50"
                          title="Télécharger PDF"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="px-2 py-1 border rounded text-red-600 hover:bg-red-50"
                          title="Supprimer"
                        >
                          Suppr.
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Envoyer une alerte</h3>
            <textarea
              className="w-full p-3 border rounded-lg mb-4"
              rows={3}
              placeholder="Description de l'urgence..."
            />
            <div className="flex gap-3">
              <Button variant="danger" onClick={sendAlert} fullWidth>
                Envoyer l'alerte
              </Button>
              <Button variant="primary" onClick={() => setShowAlertModal(false)} fullWidth>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal aperçu DUER */}
      {duerPreview && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Aperçu DUER</h3>
              <button onClick={() => setDuerPreview(null)} className="px-3 py-1 border rounded">
                Fermer
              </button>
            </div>
            {(() => {
              const doc = duerPreview.duer?.duer || duerPreview.duer || {};
              const syn = doc.synthese || {};
              return (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Secteur:</span> {doc.secteur || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Généré le:</span>{" "}
                    {new Date(doc.date_generation || duerPreview.dateCreation).toLocaleString(
                      "fr-FR"
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="font-medium">Critiques:</span>{" "}
                      <span className="text-red-600 font-medium">
                        {syn.nb_risques_critiques ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Importants:</span>{" "}
                      <span className="text-orange-600 font-medium">
                        {syn.nb_risques_importants ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Modérés:</span>{" "}
                      <span className="text-yellow-600 font-medium">
                        {syn.nb_risques_moderes ?? 0}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Unités:</span>{" "}
                    {Array.isArray(doc.unites)
                      ? doc.unites.map((u: any) => u.nom).join(", ")
                      : "—"}
                  </div>
                </div>
              );
            })()}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => handlePdf(duerPreview.id)}
                className="px-3 py-2 bg-blue-600 text-white rounded"
              >
                Télécharger PDF
              </button>
              <button
                onClick={() => handleDelete(duerPreview.id)}
                className="px-3 py-2 border border-red-300 text-red-600 rounded"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
