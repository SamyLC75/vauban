import React, { useState } from "react";
import {
  SensibilitySettings,
  DEFAULT_SENSITIVITY,
  SensibleField,
} from "../types/SensitivitySettings";

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

export const SecuritySettingsForm = () => {
  const [settings, setSettings] = useState<SensibilitySettings>(() => {
    const local = localStorage.getItem("sensitivity_settings");
    return local ? JSON.parse(local) : DEFAULT_SENSITIVITY;
  });

  const onChange = (f: SensibleField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!FIELDS.find(x => x.field === f)?.forced) {
      setSettings((s) => ({ ...s, [f]: e.target.checked }));
    }
  };

  const onSave = () => {
    localStorage.setItem("sensitivity_settings", JSON.stringify(settings));
    alert("Paramètres enregistrés !");
  };

  return (
    <form>
      {FIELDS.map(({ label, field, forced }) => (
        <div key={field}>
          <label>
            <input
              type="checkbox"
              checked={settings[field]}
              disabled={forced}
              onChange={onChange(field)}
            />
            {label} {forced && <span>(Toujours chiffré)</span>}
          </label>
        </div>
      ))}
      <button type="button" onClick={onSave}>Enregistrer</button>
    </form>
  );
};

export default SecuritySettingsForm;
