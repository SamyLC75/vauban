import React from "react";
export default function RiskCard({ risk }) {
  const color = ["bg-green-100","bg-orange-100","bg-red-100"][risk.gravite-1] || "bg-gray-100";
  return (
    <div className={`p-3 rounded shadow mb-2 ${color}`}>
      <div className="font-semibold">{risk.danger}</div>
      <div className="text-xs">Unité : {risk.unite}</div>
      <div className="text-xs">Gravité : {["Faible","Moyenne","Forte"][risk.gravite-1]}</div>
      <div className="text-xs">Mesures : {risk.mesures}</div>
    </div>
  );
}
