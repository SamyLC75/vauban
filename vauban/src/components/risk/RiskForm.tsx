// src/components/risk/RiskForm.tsx
import React, { useState, useEffect } from "react";
import { Risk } from "../../types/risk";
import { saveRisks, loadRisks } from "../../utils/storage";
import { v4 as uuidv4 } from "uuid";
import Badge from "../ui/Badge";

export default function RiskForm() {
  const [key, setKey] = useState(""); // clé de chiffrement
  const [risks, setRisks] = useState<Risk[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (key.length > 5) {
      setRisks(loadRisks(key));
      setReady(true);
    }
  }, [key]);

  const handleAdd = () => setRisks([...risks, { id: uuidv4(), unite: "", danger: "", gravite: 1, mesures: "" }]);

  const handleChange = (i: number, field: keyof Risk, value: string | number) => {
    const updated = risks.map((r, idx) => idx === i ? { ...r, [field]: value } : r);
    setRisks(updated);
  };

  const handleSave = () => {
    if (key.length > 5) saveRisks(risks, key);
  };

  if (!ready) {
    return (
      <div>
        <input
          type="password"
          placeholder="Saisir la clé de déchiffrement"
          value={key}
          onChange={e => setKey(e.target.value)}
          className="input"
        />
        <Badge color="blue">Clé requise pour accéder/éditer le DUER</Badge>
      </div>
    );
  }

  return (
    <div>
      {risks.map((r, i) => (
        <div key={r.id} className="bg-white p-4 rounded shadow mb-3">
          <input
            className="input mb-2"
            placeholder="Unité de travail"
            value={r.unite}
            onChange={e => handleChange(i, "unite", e.target.value)}
          />
          <input
            className="input mb-2"
            placeholder="Danger identifié"
            value={r.danger}
            onChange={e => handleChange(i, "danger", e.target.value)}
          />
          <label>
            Gravité :
            <select
              value={r.gravite}
              onChange={e => handleChange(i, "gravite", +e.target.value)}
            >
              <option value={1}>Faible</option>
              <option value={2}>Moyenne</option>
              <option value={3}>Forte</option>
            </select>
          </label>
          <input
            className="input mb-2"
            placeholder="Mesures de prévention"
            value={r.mesures}
            onChange={e => handleChange(i, "mesures", e.target.value)}
          />
        </div>
      ))}
      <button className="btn" onClick={handleAdd}>Ajouter un risque</button>
      <button className="btn ml-2" onClick={handleSave}>Enregistrer</button>
    </div>
  );
}
