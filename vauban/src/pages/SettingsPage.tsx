import React, { useState } from "react";
import SecuritySettingsForm from "../components/settings/SecuritySettingsForm";
import CryptoModeSwitch from "../components/settings/CryptoModeSwitch";
import Badge from "../components/ui/Badge";

export default function SettingsPage() {
  const [mode, setMode] = useState<"online" | "offline">("online");
  const [secret, setSecret] = useState("");

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Paramètres de sécurité & confidentialité</h1>
      <CryptoModeSwitch mode={mode} setMode={setMode} secret={secret} setSecret={setSecret} />
      <div className="my-6">
        <SecuritySettingsForm />
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-8 rounded text-blue-900">
        <h2 className="font-bold mb-1">Comment ça marche ?</h2>
        <ul className="list-disc pl-6">
          <li>Les noms et contacts sont toujours chiffrés et jamais envoyés en ligne.</li>
          <li>Vous choisissez quelles autres infos doivent rester confidentielles.</li>
          <li>En mode "crypté (online)", seules des données anonymisées sortent.</li>
          <li>En mode "décrypté (offline)", tout est lisible localement après saisie de la clé.</li>
        </ul>
        <div className="text-sm mt-2 italic">Votre clé reste uniquement sur votre appareil. Personne d'autre n'y a accès.</div>
      </div>
    </div>
  );
}
