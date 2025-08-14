// src/utils/api.ts
import axios from 'axios';

export const apiFetch = {
  setToken: (token: string) => {
    localStorage.setItem('vauban_token', token);
  },

  removeToken: () => {
    localStorage.removeItem('vauban_token');
  },

  hasToken: (): boolean => {
    return !!localStorage.getItem('vauban_token');
  },

  getToken: (): string | null => {
    return localStorage.getItem('vauban_token');
  },

  // Helper functions for common API calls
  get: (endpoint: string) => {
    return axios.get(endpoint);
  },

  post: (endpoint: string, data: any) => {
    return axios.post(endpoint, data);
  },

  put: (endpoint: string, data: any) => {
    return axios.put(endpoint, data);
  },

  delete: (endpoint: string) => {
    return axios.delete(endpoint);
  }
};
