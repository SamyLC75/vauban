import CryptoJS from "crypto-js";
const STORAGE_KEY = "prevention_actions";
const DEFAULT_KEY = "Zddhsks435xs_z"; // À personnaliser

export function saveActions(actions: any[], key: string = DEFAULT_KEY) {
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(actions), key).toString();
  localStorage.setItem(STORAGE_KEY, encrypted);
}

export function loadActions(key: string = DEFAULT_KEY): any[] {
  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (!encrypted) return [];
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch {
    return [];
  }
}
