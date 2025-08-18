import { io, Socket } from 'socket.io-client';
import { Alert, TeamMember } from '../types';
export {};
class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string) {
    this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5001', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.emit('user:online');
    });

    this.socket.on('alert:new', (alert: Alert) => {
      this.notifyListeners('alert:new', alert);
    });

    this.socket.on('status:update', (data: { userId: string; status: TeamMember['status'] }) => {
      this.notifyListeners('status:update', data);
    });

    this.socket.on('team:update', (members: TeamMember[]) => {
      this.notifyListeners('team:update', members);
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  private notifyListeners(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }
}

export const wsService = new WebSocketService();