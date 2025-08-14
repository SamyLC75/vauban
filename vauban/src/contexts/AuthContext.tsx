
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Organization } from '../types';
import * as AuthApi from '../services/auth.service'; // pour éviter collision des noms

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(AuthApi.getUser());
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const doLogin = async (username: string, password: string) => {
    try {
      // Appelle la fonction login du service (attention aux noms identiques !)
      const result = await AuthApi.login(username, password);
      setUser(result); // result = user (car c'est le retour de login)
      // Si tu veux aussi stocker organization, il faut l'extraire du retour d'API
      // Ex : const { user, organization } = await AuthApi.login(...)
      // Ici, tu dois ajuster selon le retour réel de ta fonction login
      // setOrganization(result.organization ?? null);
    } catch (error) {
      throw error;
    }
  };

  const doLogout = () => {
    AuthApi.logout();
    setUser(null);
    setOrganization(null);
  };

  const toggleOfflineMode = () => setIsOfflineMode(mode => !mode);

  return (
    <AuthContext.Provider value={{
      user,
      organization,
      login: doLogin,
      logout: doLogout,
      isOfflineMode,
      toggleOfflineMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
