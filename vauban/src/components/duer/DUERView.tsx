import { useState } from "react";
import { apiFetch } from "../../services/http";
import { FileSpreadsheet } from "lucide-react";

interface DUERDoc {
  secteur: string;
  date_generation: string;
  unites: Array<{
    nom: string;
    risques: Array<{
      danger: string;
      situation: string;
      gravite: number;
      probabilite: number;
      priorite: number;
      mesures_existantes: string[];
      mesures_proposees: Array<{
        type: string;
        description: string;
        delai?: string;
        cout_estime?: string;
        reference?: string;
      }>;
      suivi: {
        responsable?: string;
        echeance?: string;
        indicateur?: string;
      };
    }>;
  }>;
  synthese: any;
}

export default function DUERView({ duerId, initialDoc }: { duerId: string; initialDoc: DUERDoc }) {
  const [doc, setDoc] = useState(initialDoc);
  const [edit, setEdit] = useState(false);

  const onChangeRiskField = (uIdx: number, rIdx: number, field: string, val: any) => {
    setDoc((prev: any) => {
      const next = structuredClone(prev);
      next.unites[uIdx].risques[rIdx][field] = val;
      return next;
    });
  };

  const save = async () => {
    try {
      const response = await apiFetch(`/duer/${duerId}`, { method: 'PUT', body: JSON.stringify({ duer: doc }) });
      setEdit(false);
    } catch (error) {
      console.error('Error saving DUER:', error);
      alert('Erreur lors de la sauvegarde du DUER');
    }
  };

  return (
    <div className="duer-view p-4">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setEdit(e => !e)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {edit ? "Annuler" : "Éditer le DUER"}
        </button>
        {edit && (
          <button
            onClick={save}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Enregistrer
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {doc.unites.map((u, uIdx) => (
          <div key={uIdx} className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">{u.nom}</h3>
            {u.risques.map((r, rIdx) => (
              <div key={rIdx} className="border rounded p-3 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Priorité: {r.priorite}</span>
                  <span className={`px-2 py-1 rounded ${priorityPillClass(r.priorite)}`}>
                    {priorityPillClass(r.priorite)}
                  </span>
                </div>
                {edit ? (
                  <>
                    <div className="mb-2">
                      <label className="block mb-1">Danger:</label>
                      <input
                        type="text"
                        value={r.danger}
                        onChange={(e) => onChangeRiskField(uIdx, rIdx, "danger", e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="block mb-1">Situation:</label>
                      <textarea
                        value={r.situation}
                        onChange={(e) => onChangeRiskField(uIdx, rIdx, "situation", e.target.value)}
                        className="w-full p-2 border rounded h-20"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-2">
                      <b>Danger:</b> {r.danger}
                    </div>
                    <div className="mb-2">
                      <b>Situation:</b> {r.situation}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const priorityPillClass = (priority: number) => {
  switch (priority) {
    case 1:
      return "bg-red-100 text-red-800";
    case 2:
      return "bg-orange-100 text-orange-800";
    case 3:
      return "bg-yellow-100 text-yellow-800";
    case 4:
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
