import React from "react";
export default function Stepper({ steps, current }: { steps: string[], current: number }) {
  return (
    <div className="flex mb-4">
      {steps.map((s, i) => (
        <div key={i} className={`flex-1 text-center ${i === current ? "font-bold text-blue-800" : "text-gray-400"}`}>
          {s}
          {i < steps.length - 1 && <span className="mx-2">→</span>}
        </div>
      ))}
    </div>
  );
}
