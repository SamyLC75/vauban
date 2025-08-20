// src/utils/encryptionService.ts
import CryptoJS from "crypto-js";

const DEFAULT_KEY = process.env.REACT_APP_ENCRYPTION_KEY || "Zddhsks435xs_z"; // à surcharger en prod

export const encrypt = (data: any, key = DEFAULT_KEY) =>
  CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();

export const decrypt = (cipher: string, key = DEFAULT_KEY) =>
  JSON.parse(CryptoJS.AES.decrypt(cipher, key).toString(CryptoJS.enc.Utf8));
