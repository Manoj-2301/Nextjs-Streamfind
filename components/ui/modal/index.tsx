/*
 * ============================================================
 * IMPORTS
 * ============================================================
 */
'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  className,
  hideHeader = false,
}: ModalProps) {
  // Close on escape key

  /*
   * ============================================================
   * STATE & DATA FETCHING
   * ============================================================
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      // Calculate scrollbar width to prevent page layout jump/shift when overflow is hidden
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, onClose]);


  /*
   * ============================================================
   * RENDERING
   * ============================================================
   */
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Centered overlay - this handles the click outside now */}
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
          >
            {/* Modal Panel — flex-col with max-h so children can scroll internally */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className={cn(
                'relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden',
                className
              )}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              {!hideHeader && (
                <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#111111] shrink-0">
                  <h3 id="modal-title" className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                    {icon}
                    {title}
                  </h3>
                  <button
                    onClick={onClose}
                    aria-label="Close modal"
                    className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Children fill the remaining flex space. 
                  Use shrink-0 for fixed sections and overflow-y-auto for scrollable sections. */}
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
