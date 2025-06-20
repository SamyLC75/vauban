import { useEffect, useCallback } from 'react';
import { wsService } from '../services/websocket.service';
import { useAuth } from '../contexts/AuthContext';

export const useWebSocket = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      wsService.connect(user.id);
    }
    return () => {
      wsService.disconnect();
    };
  }, [user]);

  const on = useCallback((event: string, callback: Function) => {
    wsService.on(event, callback);
    return () => wsService.off(event, callback);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    wsService.emit(event, data);
  }, []);

  return { on, emit, wsService };
};