import React from "react";

export default function CommsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Communication</h1>
      <div>
        <span className="font-semibold">Mode actuel : </span>
        <span className="bg-blue-200 text-blue-800 rounded px-2 py-1">Crypté (online) / Décrypté (offline)</span>
      </div>
      {/* Ici, UI pour paramétrer la confidentialité, changer clé, etc */}
      <div className="bg-yellow-100 text-yellow-800 p-4 rounded shadow my-6">
        En travaux — la gestion des communications sera bientôt disponible.
      </div>
    </div>
  );
}
