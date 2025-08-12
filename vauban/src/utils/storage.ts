import CryptoJS from "crypto-js";

const STORAGE_KEY = "duer_risks";
const DEFAULT_KEY = "Zddhsks435xs_z"; // À surcharger plus tard

export function saveRisks(risks: any[], key: string = DEFAULT_KEY) {
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(risks), key).toString();
  localStorage.setItem(STORAGE_KEY, encrypted);
}

export function loadRisks(key: string = DEFAULT_KEY): any[] {
  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (!encrypted) return [];
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch {
    return [];
  }
}
