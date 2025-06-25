import React, { useState, useEffect } from "react";
import { PreventionAction } from "../../types/action";
import { saveActions, loadActions } from "../../utils/actionStorage";
import { v4 as uuidv4 } from "uuid";
import Badge from "../ui/Badge";

export default function PreventionPlanForm() {
  const [key, setKey] = useState("");
  const [actions, setActions] = useState<PreventionAction[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (key.length > 5) {
      setActions(loadActions(key));
      setReady(true);
    }
  }, [key]);

  const handleAdd = () =>
    setActions([
      ...actions,
      {
        id: uuidv4(),
        description: "",
        responsable: "",
        deadline: "",
        status: "à faire",
      },
    ]);

  const handleChange = (i: number, field: keyof PreventionAction, value: string) => {
    const updated = actions.map((a, idx) => (idx === i ? { ...a, [field]: value } : a));
    setActions(updated);
  };

  const handleStatus = (i: number, newStatus: string) => {
    const updated = actions.map((a, idx) => (idx === i ? { ...a, status: newStatus as any } : a));
    setActions(updated);
  };

  const handleSave = () => {
    if (key.length > 5) saveActions(actions, key);
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
        <Badge color="blue">Clé requise pour accéder/éditer le plan d’actions</Badge>
      </div>
    );
  }

  return (
    <div>
      {actions.map((a, i) => (
        <div key={a.id} className="bg-white p-4 rounded shadow mb-3 flex flex-col md:flex-row items-center">
          <input
            className="input mb-2 md:mb-0 md:mr-2"
            placeholder="Action"
            value={a.description}
            onChange={e => handleChange(i, "description", e.target.value)}
          />
          <input
            className="input mb-2 md:mb-0 md:mr-2"
            placeholder="Responsable"
            value={a.responsable}
            onChange={e => handleChange(i, "responsable", e.target.value)}
          />
          <input
            className="input mb-2 md:mb-0 md:mr-2"
            type="date"
            value={a.deadline}
            onChange={e => handleChange(i, "deadline", e.target.value)}
          />
          <select
            className="input mb-2 md:mb-0 md:mr-2"
            value={a.status}
            onChange={e => handleStatus(i, e.target.value)}
          >
            <option value="à faire">À faire</option>
            <option value="en cours">En cours</option>
            <option value="fait">Fait</option>
          </select>
        </div>
      ))}
      <button className="btn" onClick={handleAdd}>Ajouter une action</button>
      <button className="btn ml-2" onClick={handleSave}>Enregistrer</button>
    </div>
  );
}
