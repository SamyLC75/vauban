// src/components/duer/CarsatLegend.tsx
import React from "react";

export const CarsatLegend: React.FC<{ className?: string }>= ({ className = "" }) => {
  return (
    <div className={`mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 ${className}`}>
      <details>
        <summary className="cursor-pointer select-none font-semibold text-gray-800">
          Légende CARSAT
        </summary>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <div>
            <div className="font-medium text-gray-900">Probabilité (labels)</div>
            <ul className="mt-1 list-disc pl-5">
              <li>FA = Faible</li>
              <li>MO = Modérée</li>
              <li>FO = Forte</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-gray-900">Gravité (labels)</div>
            <ul className="mt-1 list-disc pl-5">
              <li>DR = Dommages réversibles</li>
              <li>DI = Dommages irréversibles</li>
              <li>Mortel</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-gray-900">Hiérarchie du risque</div>
            <ul className="mt-1 list-disc pl-5">
              <li>➊ = Critique</li>
              <li>➋ = Important</li>
              <li>➌ = Modéré</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
};

export default CarsatLegend;
