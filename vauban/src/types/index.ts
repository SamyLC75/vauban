export interface User {
  id: string;
  pseudonym: string;
  orgId: string;
  role: string;
  frenchCode?: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  sector: string;
  size: number;
}

export interface Alert {
  id: string;
  type: 'urgence' | 'exercice' | 'information';
  message: string;
  sender: string;
  senderId: string;
  timestamp: Date;
  responses?: AlertResponse[];
}

export interface AlertResponse {
  userId: string;
  status: 'safe' | 'danger' | 'acknowledged';
  message?: string;
  timestamp: Date;
}

export interface TeamMember {
  id: string;
  pseudonym: string;
  frenchCode: string;
  status: 'safe' | 'danger' | 'unknown' | 'offline';
  role: string;
  lastSeen: Date;
}