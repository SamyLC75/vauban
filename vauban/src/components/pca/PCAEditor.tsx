import React, { useState, useEffect } from "react";
import { PCAPlan, PCAProcessusCritique } from "../../types/pca";
import { savePCA, loadPCA } from "../../utils/pcaStorage";
import { v4 as uuidv4 } from "uuid";
import Badge from "../ui/Badge";

export default function PCAEditor() {
  const [key, setKey] = useState("");
  const [plan, setPlan] = useState<PCAPlan | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (key.length > 5) {
      const loaded = loadPCA(key);
      setPlan(loaded || {
        id: uuidv4(),
        nom: "",
        scenarios: [],
        processus: [],
        mesuresGenerales: "",
        dateMaj: new Date().toISOString(),
      });
      setReady(true);
    }
  }, [key]);

  const handleAddProcessus = () => {
    if (!plan) return;
    setPlan({
      ...plan,
      processus: [
        ...plan.processus,
        {
          id: uuidv4(),
          nom: "",
          responsable: "",
          modeDeSecours: "",
          ressourcesNecessaires: "",
        },
      ],
    });
  };

  const handleChangeProcessus = (i: number, field: keyof PCAProcessusCritique, value: string) => {
    if (!plan) return;
    const updated = plan.processus.map((p, idx) =>
      idx === i ? { ...p, [field]: value } : p
    );
    setPlan({ ...plan, processus: updated });
  };

  const handleSave = () => {
    if (key.length > 5 && plan) savePCA(plan, key);
  };

  if (!ready) {
    return (
      <div>
        <input
          type="password"
          placeholder="Clé de déchiffrement"
          value={key}
          onChange={e => setKey(e.target.value)}
          className="input"
        />
        <Badge color="blue">Clé requise pour accéder/éditer le PCA</Badge>
      </div>
    );
  }

  return (
    <div>
      <input
        className="input mb-2"
        placeholder="Nom du plan PCA"
        value={plan?.nom}
        onChange={e => setPlan(plan && { ...plan, nom: e.target.value })}
      />
      <input
        className="input mb-2"
        placeholder="Scénarios envisagés (ex : incendie, cyber, etc.)"
        value={plan?.scenarios.join(", ")}
        onChange={e =>
          setPlan(plan && { ...plan, scenarios: e.target.value.split(",").map(s => s.trim()) })
        }
      />
      <div className="my-2">
        <strong>Processus critiques</strong>
        {plan?.processus.map((proc, i) => (
          <div key={proc.id} className="bg-white p-2 rounded mb-2 shadow">
            <input
              className="input mr-2"
              placeholder="Nom"
              value={proc.nom}
              onChange={e => handleChangeProcessus(i, "nom", e.target.value)}
            />
            <input
              className="input mr-2"
              placeholder="Responsable"
              value={proc.responsable}
              onChange={e => handleChangeProcessus(i, "responsable", e.target.value)}
            />
            <input
              className="input mr-2"
              placeholder="Mode de secours"
              value={proc.modeDeSecours}
              onChange={e => handleChangeProcessus(i, "modeDeSecours", e.target.value)}
            />
            <input
              className="input"
              placeholder="Ressources nécessaires"
              value={proc.ressourcesNecessaires}
              onChange={e => handleChangeProcessus(i, "ressourcesNecessaires", e.target.value)}
            />
          </div>
        ))}
        <button className="btn" onClick={handleAddProcessus}>Ajouter un processus critique</button>
      </div>
      <textarea
        className="input mb-2"
        placeholder="Mesures générales"
        value={plan?.mesuresGenerales}
        onChange={e => setPlan(plan && { ...plan, mesuresGenerales: e.target.value })}
      />
      <button className="btn" onClick={handleSave}>Enregistrer</button>
    </div>
  );
}
