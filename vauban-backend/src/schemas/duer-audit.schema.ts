import { z } from "zod";

export const AuditIssue = z.object({
  code: z.string(), // ex: "MEASURE_NOT_SMART", "MISSING_REFERENCE"
  severity: z.enum(["critical","major","minor","info"]),
  message: z.string(),
  path: z.array(z.string()).default([]), // ex: ["unit:Atelier","risk:R001","measure:0"]
  suggestion: z.string().optional(),
});

export const AuditCoverage = z.object({
  detected_categories: z.array(z.string()),
  covered_categories: z.array(z.string()),
  missing_categories: z.array(z.string()),
  coverage_ratio: z.number(), // 0..1
});

export const AuditReport = z.object({
  summary: z.object({
    issue_counts: z.record(z.string(), z.number()),
    score: z.number().min(0).max(100),
  }),
  coverage: AuditCoverage,
  issues: z.array(AuditIssue),
});

export type TAuditReport = z.infer<typeof AuditReport>;
export type TAuditIssue = z.infer<typeof AuditIssue>;
export type TAuditCoverage = z.infer<typeof AuditCoverage>;
