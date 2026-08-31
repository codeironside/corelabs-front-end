import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'danger' | 'info' | 'success';
  size?: 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, footer, variant = 'info', size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass =
    size === 'xl' ? 'max-w-3xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className={`bg-white rounded-3xl w-full ${sizeClass} relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className={`text-lg font-bold ${variant === 'danger' ? 'text-red-600' : 'text-dark'}`}>
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-muted"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {children}
        </div>
        
        {footer && (
          <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
