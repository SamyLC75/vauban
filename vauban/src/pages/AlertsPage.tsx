import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Alert } from '../types';
export {};

export const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'urgence',
      message: 'Incendie détecté au 2ème étage',
      sender: 'Napoleon',
      senderId: '1',
      timestamp: new Date(Date.now() - 3600000),
      responses: [
        { userId: '2', status: 'safe', message: 'Je suis en sécurité dehors', timestamp: new Date() },
        { userId: '3', status: 'acknowledged', timestamp: new Date() }
      ]
    },
    {
      id: '2',
      type: 'exercice',
      message: 'Exercice d\'évacuation - RDV point de rassemblement',
      sender: 'Moliere',
      senderId: '2',
      timestamp: new Date(Date.now() - 7200000),
      responses: []
    }
  ]);

  const [showNewAlert, setShowNewAlert] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'information' as Alert['type'],
    message: ''
  });

  const [filter, setFilter] = useState<'all' | Alert['type']>('all');

  const sendAlert = () => {
    const alert: Alert = {
      id: Date.now().toString(),
      type: newAlert.type,
      message: newAlert.message,
      sender: 'Napoleon', // TODO: get from auth
      senderId: '1',
      timestamp: new Date(),
      responses: []
    };
    
    setAlerts([alert, ...alerts]);
    setNewAlert({ type: 'information', message: '' });
    setShowNewAlert(false);
  };

  const respondToAlert = (alertId: string, status: 'safe' | 'danger' | 'acknowledged') => {
    setAlerts(alerts.map(alert => {
      if (alert.id === alertId) {
        const response = {
          userId: '1', // TODO: get from auth
          status,
          timestamp: new Date()
        };
        return {
          ...alert,
          responses: [...(alert.responses || []), response]
        };
      }
      return alert;
    }));
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'urgence': return '🚨';
      case 'exercice': return '📝';
      case 'information': return 'ℹ️';
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'urgence': return 'bg-red-50 border-red-300';
      case 'exercice': return 'bg-yellow-50 border-yellow-300';
      case 'information': return 'bg-blue-50 border-blue-300';
    }
  };

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.type === filter);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-marianne-blue text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Centre d'alertes</h1>
            <p className="text-sm opacity-90">{alerts.length} alertes totales</p>
          </div>
          <Button variant="danger" onClick={() => setShowNewAlert(true)}>
            🚨 Nouvelle alerte
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Filtrer :</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-marianne-blue text-white' : 'bg-gray-100'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('urgence')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'urgence' ? 'bg-red-600 text-white' : 'bg-gray-100'
              }`}
            >
              🚨 Urgences
            </button>
            <button
              onClick={() => setFilter('exercice')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'exercice' ? 'bg-yellow-600 text-white' : 'bg-gray-100'
              }`}
            >
              📝 Exercices
            </button>
            <button
              onClick={() => setFilter('information')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'information' ? 'bg-blue-600 text-white' : 'bg-gray-100'
              }`}
            >
              ℹ️ Informations
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.map(alert => (
            <div key={alert.id} className={`bg-white rounded-lg shadow-lg p-6 border-2 ${getAlertColor(alert.type)}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                    <h3 className="text-lg font-bold">
                      {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                    </h3>
                  </div>
                  <p className="text-gray-800">{alert.message}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Par {alert.sender} • {alert.timestamp.toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Responses */}
              {alert.responses && alert.responses.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Réponses ({alert.responses.length})</h4>
                  <div className="space-y-2">
                    {alert.responses.map((response, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span>{response.status === 'safe' ? '✅' : response.status === 'danger' ? '🚨' : '👁️'}</span>
                        <span>Utilisateur {response.userId}</span>
                        {response.message && <span>: {response.message}</span>}
                        <span className="text-gray-500">• {response.timestamp.toLocaleTimeString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => respondToAlert(alert.id, 'safe')}
                  className="px-4 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                >
                  ✅ Je suis en sécurité
                </button>
                <button
                  onClick={() => respondToAlert(alert.id, 'danger')}
                  className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                >
                  🚨 J'ai besoin d'aide
                </button>
                <button
                  onClick={() => respondToAlert(alert.id, 'acknowledged')}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                >
                  👁️ Vu
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* New Alert Modal */}
      {showNewAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Envoyer une nouvelle alerte</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type d'alerte</label>
                <select
                  value={newAlert.type}
                  onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value as Alert['type'] })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="information">ℹ️ Information</option>
                  <option value="exercice">📝 Exercice</option>
                  <option value="urgence">🚨 Urgence</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={newAlert.message}
                  onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Décrivez la situation..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                variant={newAlert.type === 'urgence' ? 'danger' : 'primary'} 
                onClick={sendAlert} 
                fullWidth
              >
                Envoyer l'alerte
              </Button>
              <Button variant="primary" onClick={() => setShowNewAlert(false)} fullWidth>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};