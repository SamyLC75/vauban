import CryptoJS from "crypto-js";
const STORAGE_KEY = "pca_plan";
const DEFAULT_KEY = "Zddhsks435xs_z"; // A surcharger par l'utilisateur

export function savePCA(pca: any, key: string = DEFAULT_KEY) {
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(pca), key).toString();
  localStorage.setItem(STORAGE_KEY, encrypted);
}

export function loadPCA(key: string = DEFAULT_KEY): any | null {
  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (!encrypted) return null;
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}
