import React from "react";

const RiskLegendPopover: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label="Aide CARSAT (gravité, probabilité, criticité)"
        onClick={() => setOpen(v => !v)}
        className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
        title="Aide CARSAT"
      >
        ?
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-96 max-w-[90vw] rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-lg">
          <div className="space-y-1 text-gray-700">
            <p><b>Probabilité (1–4)</b> : fréquence d’occurrence.</p>
            <p><b>Gravité (1–4)</b> : sévérité (DR = réversible, DI = irréversible, Mortel).</p>
            <p><b>Criticité</b> = Gravité × Probabilité → hiérarchie (🟥 Critique, 🟧 Important, 🟨 Modéré).</p>
            <p className="text-xs text-gray-500">Astuce : laissez les pondérations par défaut si vous n’êtes pas sûr.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskLegendPopover;
