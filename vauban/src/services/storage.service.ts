import { CryptoService } from './crypto.service';
export {};
export class StorageService {
  private static isOfflineMode = false;

  static setOfflineMode(enabled: boolean) {
    this.isOfflineMode = enabled;
    if (enabled) {
      // En mode offline, on déchiffre tout
      this.decryptAllData();
    } else {
      // En mode online, on rechiffre tout
      this.encryptAllData();
    }
  }

  static setItem(key: string, value: any) {
    if (this.isOfflineMode) {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      const encrypted = CryptoService.encrypt(value);
      localStorage.setItem(key, encrypted);
    }
  }

  static getItem(key: string): any {
    const data = localStorage.getItem(key);
    if (!data) return null;

    if (this.isOfflineMode) {
      return JSON.parse(data);
    } else {
      return CryptoService.decrypt(data);
    }
  }

  private static encryptAllData() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '');
        const encrypted = CryptoService.encrypt(data);
        localStorage.setItem(key, encrypted);
      } catch (e) {
        // Déjà chiffré ou invalide
      }
    });
  }

  private static decryptAllData() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      try {
        const encrypted = localStorage.getItem(key) || '';
        const decrypted = CryptoService.decrypt(encrypted);
        if (decrypted) {
          localStorage.setItem(key, JSON.stringify(decrypted));
        }
      } catch (e) {
        // Déjà déchiffré ou invalide
      }
    });
  }
}