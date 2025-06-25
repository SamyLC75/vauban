import CryptoJS from "crypto-js";
import { SensitivitySettings, DEFAULT_SENSITIVITY, SensibleField } from "../../types/SensitivitySettings";

const getSettings = (): SensitivitySettings => {
  return JSON.parse(localStorage.getItem("sensitivity_settings") || "null") || DEFAULT_SENSITIVITY;
};

export function encryptDataFields(data: any, key: string): any {
  const settings = getSettings();
  const encrypted: any = {};
  Object.keys(data).forEach((k) => {
    if (settings[k as SensibleField]) {
      encrypted[k] = CryptoJS.AES.encrypt(JSON.stringify(data[k]), key).toString();
    } else {
      encrypted[k] = data[k];
    }
  });
  return encrypted;
}

export function decryptDataFields(data: any, key: string): any {
  const settings = getSettings();
  const decrypted: any = {};
  Object.keys(data).forEach((k) => {
    if (settings[k as SensibleField]) {
      decrypted[k] = JSON.parse(CryptoJS.AES.decrypt(data[k], key).toString(CryptoJS.enc.Utf8));
    } else {
      decrypted[k] = data[k];
    }
  });
  return decrypted;
}
