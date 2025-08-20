import React from "react";
import { apiFetch } from "../../services/http";
import { CoverageBadge } from "./CoverageBadge";

type AuditReport = {
  summary: { issue_counts: Record<string, number>; score: number };
  coverage: { 
    detected_categories: string[]; 
    covered_categories: string[]; 
    missing_categories: string[]; 
    coverage_ratio: number 
  };
  issues: Array<{ 
    code: string; 
    severity: "critical"|"major"|"minor"|"info"; 
    message: string; 
    path: string[]; 
    suggestion?: string 
  }>;
};

export const AuditPanel: React.FC<{ duerId?: string; doc?: any }> = ({ duerId, doc }) => {
  const [report, setReport] = React.useState<AuditReport | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const runAudit = async () => {
    try {
      setLoading(true); 
      setErr("");
      const data = duerId
        ? await apiFetch<{ report: AuditReport }>(`/api/duer/${duerId}/ia-audit`, { method: "POST" })
        : await apiFetch<{ report: AuditReport }>(`/api/duer/ia-audit`, { 
            method: "POST", 
            body: JSON.stringify({ doc }) 
          });
      setReport(data.report);
    } catch (e: any) {
      setErr(e?.message || "Erreur audit");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { 
    runAudit();
  }, [duerId]);

  if (loading) return <div className="text-sm text-gray-600">Audit IA en cours…</div>;
  if (err) return <div className="text-sm text-red-600">{err}</div>;
  if (!report) return null;

  const groups: Record<string, typeof report.issues> = {};
  report.issues.forEach(i => { (groups[i.severity] ||= []).push(i); });

  const SevChip: React.FC<{ s: string }> = ({ s }) => {
    const map: Record<string, string> = {
      critical: "bg-red-100 text-red-700",
      major: "bg-orange-100 text-orange-700",
      minor: "bg-yellow-100 text-yellow-700",
      info: "bg-blue-100 text-blue-700"
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[s] || ""}`}>{s}</span>;
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Audit qualité DUER</h4>
        <button 
          onClick={runAudit} 
          className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        >
          Relancer
        </button>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <span className="text-sm">Score qualité :</span>
        <span className={`text-lg font-bold ${
          report.summary.score >= 85 ? "text-green-600" : 
          report.summary.score >= 60 ? "text-yellow-600" : "text-orange-600"
        }`}>
          {report.summary.score}/100
        </span>
        <div className="text-sm text-gray-600">
          Critiques: {report.summary.issue_counts.critical || 0} • 
          Majeurs: {report.summary.issue_counts.major || 0} • 
          Mineurs: {report.summary.issue_counts.minor || 0}
        </div>
      </div>

      <div className="mt-3">
        <CoverageBadge
          ratio={report.coverage.coverage_ratio}
          detected={report.coverage.detected_categories}
          missing={report.coverage.missing_categories}
        />
      </div>

      <div className="mt-4 space-y-3">
        {Object.entries(groups).sort((a,b) => {
          const rank = (s: string) => ({critical:0, major:1, minor:2, info:3}[s] ?? 9);
          return rank(a[0]) - rank(b[0]);
        }).map(([sev, list]) => (
          <div key={sev}>
            <div className="flex items-center gap-2 mb-1">
              <SevChip s={sev} />
              <span className="text-sm text-gray-700">({list.length})</span>
            </div>
            <ul className="space-y-1">
              {list.map((i, k) => (
                <li key={k} className="text-sm">
                  <span className="text-gray-800">{i.message}</span>
                  {i.path?.length ? <span className="text-gray-500"> — {i.path.join(" > ")}</span> : null}
                  {i.suggestion ? (
                    <div className="text-xs text-gray-600 mt-0.5">💡 {i.suggestion}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
