// src/components/layout/Header.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isOfflineMode, toggleOfflineMode, logout } = useAuth();

  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard' },
    { name: 'Alertes', href: '/alerts' },
    { name: 'Équipe', href: '/team' },
  ];

  return (
    <header className="bg-marianne-blue text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold">Stratégie Vauban</h1>
            <nav className="hidden md:flex space-x-4">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.href
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-700'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm">{user?.frenchCode || user?.pseudonym}</span>
            <button
              onClick={toggleOfflineMode}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isOfflineMode ? 'bg-red-600' : 'bg-green-600'
              }`}
            >
              {isOfflineMode ? '🔒 Offline' : '🌐 Online'}
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-sm hover:text-blue-200"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};