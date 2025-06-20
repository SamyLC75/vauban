import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Organization } from '../types';
import { AuthService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  login: (orgCode: string, pseudonym: string) => Promise<void>;
  logout: () => void;
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(AuthService.getUser());
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const login = async (orgCode: string, pseudonym: string) => {
    try {
      console.log('Tentative de connexion...', { orgCode, pseudonym });
      const response = await AuthService.login(orgCode, pseudonym);
      console.log('Réponse reçue:', response);
      setUser(response.user);
      setOrganization(response.organization);
    } catch (error) {
      console.error('Erreur login:', error);
      throw error;
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
    setOrganization(null);
  };

  const toggleOfflineMode = () => {
    setIsOfflineMode(!isOfflineMode);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      organization, 
      login, 
      logout, 
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