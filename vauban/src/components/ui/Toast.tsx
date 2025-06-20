import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
export {};
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  duration = 3000, 
  onClose 
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-blue-600',
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return createPortal(
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-white shadow-lg ${styles[type]} animate-slide-down`}>
      <span className="text-xl">{icons[type]}</span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 hover:opacity-80">✕</button>
    </div>,
    document.body
  );
};