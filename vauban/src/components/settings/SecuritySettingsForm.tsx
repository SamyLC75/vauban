import React, { useState } from "react";
import { SensitivitySettings, DEFAULT_SENSITIVITY, SensibleField } from "../../types/sensitivity";
import { setSensitivity, getSensitivity } from "../../utils/sensitivity";
import Badge from "../ui/Badge";

const FIELDS: { label: string; field: SensibleField; forced: boolean }[] = [
  { label: "Nom utilisateur", field: "nomUtilisateur", forced: true },
  { label: "Email utilisateur", field: "emailUtilisateur", forced: true },
  { label: "Nom employé", field: "nomEmploye", forced: true },
  { label: "Email employé", field: "emailEmploye", forced: true },
  { label: "Téléphone employé", field: "telEmploye", forced: true },
  { label: "Région", field: "region", forced: false },
  { label: "Effectif", field: "effectif", forced: false },
  { label: "Secteur", field: "secteur", forced: false },
  { label: "Sous-secteur", field: "sousSecteur", forced: false },
];

export default function SecuritySettingsForm() {
  const [settings, setSettings] = useState<SensitivitySettings>(() => getSensitivity());

  const onChange = (f: SensibleField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!FIELDS.find(x => x.field === f)?.forced) {
      setSettings((s) => ({ ...s, [f]: e.target.checked }));
    }
  };

  const onSave = () => {
    setSensitivity(settings);
    alert("Paramètres enregistrés !");
  };

  return (
    <form>
      <h2 className="text-xl font-bold mb-4">Champs confidentiels à chiffrer</h2>
      {FIELDS.map(({ label, field, forced }) => (
        <div key={field} className="flex items-center mb-2">
          <input
            type="checkbox"
            checked={settings[field]}
            disabled={forced}
            onChange={onChange(field)}
            className="mr-2"
          />
          <span>{label}</span>
          {forced && (
            <Badge color="blue" >Toujours chiffré</Badge>
          )}
        </div>
      ))}
      <button type="button" className="btn mt-4" onClick={onSave}>
        Enregistrer les paramètres
      </button>
    </form>
  );
}
