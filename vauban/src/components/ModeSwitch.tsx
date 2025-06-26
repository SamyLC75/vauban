import React from "react";

export default function ModeSwitch({ mode, setMode }: { mode: string; setMode: (mode: string) => void }) {
  return (
    <div className="flex items-center space-x-4">
      <span className={`px-2 py-1 rounded ${mode === "online" ? "bg-blue-100 text-blue-800" : "bg-gray-200"}`}>Mode crypté (Online)</span>
      <button
        className="px-2 py-1 border rounded"
        onClick={() => setMode(mode === "online" ? "offline" : "online")}
      >
        {mode === "online" ? "Afficher en clair (Offline)" : "Repasser en mode crypté"}
      </button>
    </div>
  );
}
