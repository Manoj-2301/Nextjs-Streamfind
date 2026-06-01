'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({ options, value, onChange, placeholder = 'Select...', className = '', disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Select Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen(!isOpen);
          if (!isOpen) setSearchQuery('');
        }}
        className={`w-full flex items-center justify-between text-left focus:outline-none transition-all duration-200 border rounded-2xl p-4 ${
          isOpen ? 'bg-white/10 border-brand/50 shadow-lg' : 'bg-black/30 border-white/5 hover:border-white/15 hover:bg-white/5'
        } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
      >
        <span className="block truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 text-white/50 ${isOpen ? 'rotate-180 text-brand' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute z-50 w-full mt-2 bg-black/95 backdrop-blur-xl border border-brand/50 rounded-2xl shadow-2xl overflow-hidden shadow-brand/10 flex flex-col"
            style={{ maxHeight: '300px' }}
          >
            {options.length > 6 && (
              <div className="p-2 border-b border-white/10 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-8 pr-4 text-xs text-white focus:outline-none focus:border-brand placeholder-white/30"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
            
            <div className="overflow-y-auto custom-scrollbar flex-1" data-lenis-prevent="true">
              {options.length === 0 ? (
                <div className="p-4 text-xs text-white/40 text-center font-medium">Loading options...</div>
              ) : options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <div className="p-4 text-xs text-white/40 text-center font-medium">No results found</div>
              ) : (
                options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase())).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold transition-colors hover:bg-brand/10 ${
                      value === opt.value ? 'text-brand bg-brand/5' : 'text-white'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {value === opt.value && <Check className="w-3.5 h-3.5 text-brand" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
