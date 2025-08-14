// src/components/ui/Button.tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'danger';
  fullWidth?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  type = 'button',
  variant = 'primary',
  fullWidth = false,
  disabled = false
}) => {
  const baseStyles = "py-3 px-4 font-medium rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed";
  const widthStyles = fullWidth ? "w-full" : "";
  const variantStyles = variant === 'primary' 
    ? "bg-marianne-blue text-white hover:bg-blue-800" 
    : "bg-marianne-red text-white hover:bg-red-800";
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${widthStyles} ${variantStyles}`}
      style={{ 
        backgroundColor: disabled ? '#999' : (variant === 'primary' ? '#000091' : '#E1000F')
      }}
    >
      {children}
    </button>
  );
};