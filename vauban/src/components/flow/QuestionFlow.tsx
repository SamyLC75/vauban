// src/components/flow/QuestionFlow.tsx
import React from "react";

export type Question = {
  id: string;
  question: string;
  type: "oui_non" | "texte" | "number" | "choix_multiple" | "scale_1_5";
  options?: string[];          // pour choix_multiple
  per_unit?: boolean;          // une valeur par unité
  showIf?: { qid: string; equals: string }[]; // conditions simples
  justification?: string;      // raison de la question
  impact?: string;             // impact de la réponse
};

export const QuestionFlow: React.FC<{
  questions: Question[];
  values: Record<string, string | Record<string, string>>;
  onChange: (id: string, val: string, unite?: string) => void;
  unites?: string[];
}> = ({ questions, values, onChange, unites = [] }) => {
  const visible = questions.filter(q =>
    (q.showIf || []).every(c => values[c.qid] === c.equals)
  );

  const renderQuestionInput = (q: Question, unite?: string) => {
    const inputId = unite ? `${q.id}-${unite}` : q.id;
    const value = unite 
      ? (values[q.id] as Record<string, string>)?.[unite] || '' 
      : (values[q.id] as string) || '';
    
    const handleChange = (val: string) => {
      onChange(q.id, val, unite);
    };

    switch (q.type) {
      case 'oui_non':
        return (
          <div className="mt-2 flex gap-4">
            {['Oui', 'Non'].map((v) => (
              <label key={v} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={inputId}
                  value={v}
                  checked={value === v}
                  onChange={() => handleChange(v)}
                  className="h-4 w-4 text-blue-600"
                />
                {v}
              </label>
            ))}
          </div>
        );

      case 'choix_multiple':
        return (
          <select
            className="mt-2 w-full border rounded px-3 py-2 bg-white"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
          >
            <option value="">Sélectionnez une option</option>
            {q.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'scale_1_5':
        return (
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <label key={num} className="flex items-center">
                <input
                  type="radio"
                  name={inputId}
                  value={num}
                  checked={value === num.toString()}
                  onChange={() => handleChange(num.toString())}
                  className="h-4 w-4 text-blue-600 mr-1"
                />
                {num}
              </label>
            ))}
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            className="mt-2 w-full border rounded px-3 py-2"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Entrez un nombre…"
          />
        );

      default: // texte
        return (
          <input
            type="text"
            className="mt-2 w-full border rounded px-3 py-2"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Votre réponse…"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {visible.map((q) => (
        <div key={q.id} className="p-4 border rounded-lg bg-white shadow-sm">
          <div className="mb-2">
            <p className="font-medium text-gray-900">{q.question}</p>
            {q.justification && (
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium">Justification :</span> {q.justification}
              </p>
            )}
            {q.impact && (
              <p className="text-sm text-gray-500">
                <span className="font-medium">Impact :</span> {q.impact}
              </p>
            )}
          </div>

          {q.per_unit && unites.length > 0 ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm font-medium text-gray-700">Réponses par unité :</p>
              {unites.map((unite) => (
                <div key={unite} className="pl-4 border-l-2 border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {unite}:
                  </label>
                  {renderQuestionInput(q, unite)}
                </div>
              ))}
            </div>
          ) : (
            renderQuestionInput(q)
          )}
        </div>
      ))}
    </div>
  );
};
