import axios from 'axios';
import type {User, Organization} from '../types';

const API_URL = 'http://localhost:5000/api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    pseudonym: string;
    frenchCode: string;
    orgId: string;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    code: string;
    sector : string;
    size : number;
  };
}

export class AuthService {
  private static TOKEN_KEY = 'vauban_auth_token';
  private static USER_KEY = 'vauban_user';

  static async login(orgCode: string, pseudonym: string): Promise<LoginResponse> {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        orgCode,
        pseudonym
      });
      
      const { token, user } = response.data;
      
      // Stockage sécurisé
      sessionStorage.setItem(this.TOKEN_KEY, token);
      sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
      
      // Configuration axios pour les prochaines requêtes
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return response.data;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw new Error('Code organisation ou pseudonyme invalide');
    }
  }

  static logout(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    delete axios.defaults.headers.common['Authorization'];
  }

  static getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  static getUser(): User | null {
    const raw = sessionStorage.getItem(this.USER_KEY);
    if (!raw) return null;

    try {
      // on "force" le JSON dans le type User
      return JSON.parse(raw) as User;
    } catch (e) {
      console.warn('Utilisateur en storage invalide, purge.', e);
      sessionStorage.removeItem(this.USER_KEY);
      return null;
    }
  }

  static isAuthenticated(): boolean {
    return !!this.getUser();                 // true seulement si getUser() != null
  }
}