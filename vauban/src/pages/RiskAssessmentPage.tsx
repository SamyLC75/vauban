import React from "react";
import RiskForm from "../components/risk/RiskForm";
import Stepper from "../components/ui/Stepper";

export default function RiskAssessmentPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Analyse des risques (DUER)</h1>
      <Stepper steps={["Unité de travail", "Risques", "Mesures de prévention", "Validation"]} current={1} />
      <RiskForm />
    </div>
  );
}
