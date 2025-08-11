import React, { useState } from "react";
import { Button } from "../components/ui/Button";
import { Header } from "../components/layout/Header";
import Badge from "../components/ui/Badge";
import { useNavigate } from "react-router-dom";
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Lié à la vraie équipe sécurisée (anonymisée en online !)
  const teamMembers = [
    { id: 1, name: 'Napoléon', status: 'safe', role: 'Directeur' },
    { id: 2, name: 'Molière', status: 'safe', role: 'RH' },
    { id: 3, name: 'Voltaire', status: 'unknown', role: 'IT' },
    { id: 4, name: 'Hugo', status: 'safe', role: 'Commercial' },
  ];

  // Statut synthétique pour chaque module clé
  const modules = [
    { label: "Analyse des risques (DUER)", done: true, to: "/risques" },
    { label: "PCA (Plan de Continuité)", done: true, to: "/pca" },
    { label: "Plan d'actions de prévention", done: false, to: "/actions" },
    { label: "Export PDF sécurisé", done: false, to: "/pdf" },
  ];

  const sendAlert = () => {
    const newAlert = {
      id: Date.now(),
      type: "urgence",
      message: "Alerte test",
      time: new Date().toLocaleTimeString("fr-FR"),
      sender: "Napoléon",
    };
    setAlerts([newAlert, ...alerts]);
    setShowAlertModal(false);
  };

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
                  <Button onClick={() => navigate(m.to)}>
                    Accéder
                  </Button>
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
    </div>
  );
};
