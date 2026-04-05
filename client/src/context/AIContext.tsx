import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { useTheme } from './ThemeContext';

interface AIContextType {
    contextData: any;
    setContextData: (data: any) => void;
    isEnabled: boolean;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [contextData, setContextData] = useState<any>(null);
    const { settings } = useTheme();
    const isEnabled = settings?.isAiEnabled ?? false;

    return (
        <AIContext.Provider value={{ contextData, setContextData, isEnabled }}>
            {children}
        </AIContext.Provider>
    );
};

export const useAI = () => {
    const context = useContext(AIContext);
    if (context === undefined) {
        // Fallback for safety, though it should be wrapped
        return { contextData: null, setContextData: () => {}, isEnabled: false };
    }
    return context;
};
