import { SensitivitySettings, DEFAULT_SENSITIVITY } from "../types/sensitivity";

export function getSensitivity(): SensitivitySettings {
  return JSON.parse(localStorage.getItem("sensitivity_settings") || "null") || DEFAULT_SENSITIVITY;
}

export function setSensitivity(settings: SensitivitySettings) {
  localStorage.setItem("sensitivity_settings", JSON.stringify(settings));
}
