import React from "react";
import PreventionPlanForm from "../components/actions/PreventionPlanForm";
import Stepper from "../components/ui/Stepper";

export default function PreventionPlanPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Plan d’actions de prévention</h1>
      <Stepper steps={["Identification", "Planification", "Suivi"]} current={2} />
      <PreventionPlanForm />
    </div>
  );
}
