'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const sizeClassMap = {
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl'
} as const;

type ModalSize = keyof typeof sizeClassMap;

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  className?: string;
  closeOnBackdrop?: boolean;
}

export const Modal = ({
  title,
  isOpen,
  onClose,
  children,
  size = 'md',
  className = '',
  closeOnBackdrop = false
}: ModalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) {
    return null;
  }

  const containerClasses = `w-full ${sizeClassMap[size]} max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl ${className}`.trim();

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div
        className={`${containerClasses} flex flex-col`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-500 transition hover:bg-gray-200"
            aria-label="Fechar modal"
          >
            Fechar
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};
