// src/components/risks/RiskMatrixEditor.tsx
import React from "react";

// Helper function to clamp values between min and max
const clamp = (v: number, min: number, max: number) => 
  Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

export const RiskMatrixEditor: React.FC<{
  weightProb: number;
  weightGrav: number;
  onChange: (p: number, g: number) => void;
}> = ({ weightProb, weightGrav, onChange }) => {
  const handleProbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = clamp(Number(e.target.value), 0.5, 2);
    onChange(newVal, weightGrav);
  };

  const handleGravChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = clamp(Number(e.target.value), 0.5, 2);
    onChange(weightProb, newVal);
  };

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div>
        <label className="block text-sm font-medium">Pondération Probabilité</label>
        <input 
          type="number" 
          step="0.05" 
          value={weightProb}
          onChange={handleProbChange}
          className="border rounded px-2 py-1 w-full" 
          min="0.5" 
          max="2" 
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Pondération Gravité</label>
        <input 
          type="number" 
          step="0.05" 
          value={weightGrav}
          onChange={handleGravChange}
          className="border rounded px-2 py-1 w-full" 
          min="0.5" 
          max="2" 
        />
      </div>
    </div>
  );
};
