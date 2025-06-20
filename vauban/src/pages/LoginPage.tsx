import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const [orgCode, setOrgCode] = useState('');
  const [pseudonym, setPseudonym] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(orgCode, pseudonym);
      toast.success('Connexion réussie !');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Code organisation ou pseudonyme invalide');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-marianne-blue to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-2" style={{ color: '#000091' }}>
          Stratégie Vauban
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Gestion de crise pour PME françaises
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code Organisation
            </label>
            <input
              type="text"
              value={orgCode}
              onChange={(e) => setOrgCode(e.target.value)}
              placeholder="VAUBAN-DEMO-2024"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Votre Pseudonyme
            </label>
            <input
              type="text"
              value={pseudonym}
              onChange={(e) => setPseudonym(e.target.value)}
              placeholder="Ex: Napoleon, Molière..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <Button 
            type="submit" 
            variant="primary" 
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? 'Connexion...' : 'Accéder à la cellule de crise'}
          </Button>
        </form>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-center text-gray-700">
            <strong>Mode démo :</strong> Code : <code className="bg-white px-2 py-1 rounded">VAUBAN-DEMO-2024</code>
          </p>
        </div>
      </div>
    </div>
  );
};