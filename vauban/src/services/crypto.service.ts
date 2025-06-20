import CryptoJS from 'crypto-js';
export {};
export class CryptoService {
  private static secretKey = process.env.REACT_APP_CRYPTO_KEY || 'vauban-secret-key-32-characters!!';

  static encrypt(data: any): string {
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, this.secretKey).toString();
  }

  static decrypt(encryptedData: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  static hashPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
  }

  static generateSecureCode(): string {
    const randomBytes = CryptoJS.lib.WordArray.random(16);
    return randomBytes.toString(CryptoJS.enc.Hex).toUpperCase().match(/.{4}/g)!.join('-');
  }
}