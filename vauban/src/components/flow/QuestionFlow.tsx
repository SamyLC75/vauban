// src/components/flow/QuestionFlow.tsx
import React from "react";

export type Question = {
  id: string;
  question: string;
  type: "oui_non" | "texte";
  showIf?: { qid: string; equals: string }[]; // conditions simples
};

export const QuestionFlow: React.FC<{
  questions: Question[];
  values: Record<string, string>;
  onChange: (id: string, val: string) => void;
}> = ({ questions, values, onChange }) => {
  const visible = questions.filter(q =>
    (q.showIf || []).every(c => values[c.qid] === c.equals)
  );
  return (
    <div className="space-y-4">
      {visible.map((q, idx) => (
        <div key={`${q.id}-${idx}`} className="p-4 border rounded-lg">
          <p className="font-medium">{q.question}</p>
          {q.type === "oui_non" ? (
            <div className="mt-2 flex gap-4">
              {['oui', 'non'].map(v => (
                <label key={v} className="inline-flex items-center gap-2">
                  <input 
                    type="radio" 
                    name={q.id} 
                    value={v}
                    checked={values[q.id] === v}
                    onChange={e => onChange(q.id, e.target.value)}
                  />
                  {v}
                </label>
              ))}
            </div>
          ) : (
            <input
              className="mt-2 w-full border rounded px-3 py-2"
              value={values[q.id] || ""}
              onChange={e => onChange(q.id, e.target.value)}
              placeholder="Votre réponse…"
            />
          )}
        </div>
      ))}
    </div>
  );
};
