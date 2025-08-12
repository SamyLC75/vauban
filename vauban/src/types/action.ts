export type ActionStatus = "à faire" | "en cours" | "fait";

export interface PreventionAction {
  id: string;
  description: string;
  responsable: string;
  deadline: string;
  status: ActionStatus;
  isSensitive?: boolean;
}
