import React from "react";
import PCAEditor from "../components/pca/PCAEditor";
import Stepper from "../components/ui/Stepper";

export default function PCAEditorPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Plan de Continuité d'Activité (PCA)</h1>
      <Stepper steps={["Préparation", "Processus critiques", "Mesures générales", "Validation"]} current={2} />
      <PCAEditor />
    </div>
  );
}
