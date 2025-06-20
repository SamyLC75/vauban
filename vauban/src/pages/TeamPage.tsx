import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { FrenchCodesService } from '../services/frenchCodes.service';

interface TeamMember {
  id: string;
  realName: string;
  frenchCode: string;
  role: string;
  status: 'safe' | 'danger' | 'unknown' | 'offline';
  lastSeen: Date;
  phone?: string;
  email?: string;
}

export const TeamPage = () => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [viewMode, setViewMode] = useState<'codes' | 'real'>('codes');
  const [newMember, setNewMember] = useState({ name: '', role: '', phone: '', email: '' });
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      realName: 'Jean Dupont',
      frenchCode: 'Napoleon',
      role: 'Directeur',
      status: 'safe',
      lastSeen: new Date(),
      phone: '06********',
      email: 'j.dupont@***'
    },
    {
      id: '2',
      realName: 'Marie Martin',
      frenchCode: 'Moliere',
      role: 'RH',
      status: 'safe',
      lastSeen: new Date(),
      phone: '06********',
      email: 'm.martin@***'
    },
    {
      id: '3',
      realName: 'Pierre Bernard',
      frenchCode: 'Voltaire',
      role: 'IT',
      status: 'unknown',
      lastSeen: new Date(Date.now() - 3600000),
      phone: '06********',
      email: 'p.bernard@***'
    },
  ]);

  const addTeamMember = () => {
    const newTeamMember: TeamMember = {
      id: Date.now().toString(),
      realName: newMember.name,
      frenchCode: FrenchCodesService.getRandomCode(),
      role: newMember.role,
      status: 'offline',
      lastSeen: new Date(),
      phone: newMember.phone,
      email: newMember.email,
    };
    
    setTeamMembers([...teamMembers, newTeamMember]);
    setNewMember({ name: '', role: '', phone: '', email: '' });
    setShowAddMember(false);
  };

  const updateStatus = (memberId: string, status: TeamMember['status']) => {
    setTeamMembers(members =>
      members.map(m => m.id === memberId ? { ...m, status, lastSeen: new Date() } : m)
    );
  };

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'safe': return 'bg-green-100 text-green-800 border-green-300';
      case 'danger': return 'bg-red-100 text-red-800 border-red-300';
      case 'unknown': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'offline': return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: TeamMember['status']) => {
    switch (status) {
      case 'safe': return '✅';
      case 'danger': return '🚨';
      case 'unknown': return '❓';
      case 'offline': return '📵';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-marianne-blue text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Gestion de l'équipe</h1>
          <p className="text-sm opacity-90">
            {teamMembers.length} membres • Mode {viewMode === 'codes' ? 'Codes français' : 'Données réelles'}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Mode d'affichage :</span>
            <button
              onClick={() => setViewMode(viewMode === 'codes' ? 'real' : 'codes')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'codes'
                  ? 'bg-marianne-blue text-white'
                  : 'bg-marianne-red text-white'
              }`}
            >
              {viewMode === 'codes' ? '🔒 Codes français' : '🔓 Données réelles'}
            </button>
          </div>
          
          <Button variant="primary" onClick={() => setShowAddMember(true)}>
            ➕ Ajouter un membre
          </Button>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map(member => (
            <div key={member.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">
                  {viewMode === 'codes' ? member.frenchCode : member.realName}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(member.status)}`}>
                  {getStatusIcon(member.status)} {member.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Rôle :</span> {member.role}</p>
                <p><span className="font-medium">Dernière activité :</span> {member.lastSeen.toLocaleTimeString('fr-FR')}</p>
                {viewMode === 'real' && (
                  <>
                    <p><span className="font-medium">Tél :</span> {member.phone || 'Non renseigné'}</p>
                    <p><span className="font-medium">Email :</span> {member.email || 'Non renseigné'}</p>
                  </>
                )}
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateStatus(member.id, 'safe')}
                  className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors text-sm"
                >
                  ✅ Sain
                </button>
                <button
                  onClick={() => updateStatus(member.id, 'danger')}
                  className="px-3 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors text-sm"
                >
                  🚨 Danger
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Statistics */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Statistiques de l'équipe</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {teamMembers.filter(m => m.status === 'safe').length}
              </div>
              <div className="text-sm text-gray-600">En sécurité</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">
                {teamMembers.filter(m => m.status === 'danger').length}
              </div>
              <div className="text-sm text-gray-600">En danger</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">
                {teamMembers.filter(m => m.status === 'unknown').length}
              </div>
              <div className="text-sm text-gray-600">Inconnu</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-gray-600">
                {teamMembers.filter(m => m.status === 'offline').length}
              </div>
              <div className="text-sm text-gray-600">Hors ligne</div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Ajouter un membre</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nom complet"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Rôle"
                value={newMember.role}
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="tel"
                placeholder="Téléphone (optionnel)"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="email"
                placeholder="Email (optionnel)"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="primary" onClick={addTeamMember} fullWidth>
                Ajouter
              </Button>
              <Button variant="primary" onClick={() => setShowAddMember(false)} fullWidth>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};