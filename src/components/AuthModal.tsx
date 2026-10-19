import React from 'react';
import { createPortal } from 'react-dom';
import { User } from '../types';
import { ClientAuthManager } from './ClientAuthManager';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User, role?: 'client' | 'staff' | 'admin') => void;
  initialMode?: 'login' | 'register';
  currentUser?: User | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md my-auto animate-in zoom-in-95 duration-200">
        <ClientAuthManager
          initialView={initialMode === 'register' ? 'register' : 'login'}
          onClose={onClose}
          onLoginSuccess={(user) => {
            if (user) {
              onAuthSuccess(user, user.role);
            }
            onClose();
          }}
        />
      </div>
    </div>,
    document.body
  );
};
