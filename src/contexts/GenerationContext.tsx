'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GenerationContextType {
  activeGenerations: number;
  setActiveGenerations: (count: number) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [activeGenerations, setActiveGenerations] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <GenerationContext.Provider 
      value={{ 
        activeGenerations, 
        setActiveGenerations, 
        isGenerating, 
        setIsGenerating 
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (context === undefined) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
}
