import React from "react";

export const CoverageBadge: React.FC<{ ratio: number; detected: string[]; missing: string[] }> = ({ ratio, detected, missing }) => {
  const pct = Math.round((ratio || 0) * 100);
  const color =
    pct >= 85 ? "bg-green-100 text-green-700" :
    pct >= 60 ? "bg-yellow-100 text-yellow-700" :
    "bg-orange-100 text-orange-700";

  return (
    <div className="flex items-center gap-3">
      <span className={`px-2 py-1 rounded text-sm font-medium ${color}`}>Couverture : {pct}%</span>
      {missing.length > 0 && (
        <span className="text-xs text-gray-600">Manquants : {missing.join(", ")}</span>
      )}
      <details className="ml-auto">
        <summary className="text-xs text-gray-600 cursor-pointer">Détails</summary>
        <div className="mt-2 text-xs">
          <div><strong>Détectés</strong> : {detected.join(", ") || "—"}</div>
          <div><strong>Manquants</strong> : {missing.join(", ") || "—"}</div>
        </div>
      </details>
    </div>
  );
};
