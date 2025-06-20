// Base de données en mémoire pour le développement
export const dbConfig = {
    organizations: new Map<string, any>(),
    users: new Map<string, any>(),
    alerts: new Map<string, any>(),
    teams: new Map<string, any>()
  };
  
  // Données de test
  dbConfig.organizations.set('demo', {
    id: 'demo',
    name: 'Organisation Demo',
    code: 'VAUBAN-DEMO-2024',
    sector: 'Services',
    size: 15,
    createdAt: new Date()
  });
  
  dbConfig.users.set('1', {
    id: '1',
    pseudonym: 'Napoleon',
    frenchCode: 'Napoleon',
    orgId: 'demo',
    role: 'admin',
    status: 'safe',
    createdAt: new Date()
  });