import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface AIContextType {
    contextData: any;
    setContextData: (data: any) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [contextData, setContextData] = useState<any>(null);
    return (
        <AIContext.Provider value={{ contextData, setContextData }}>
            {children}
        </AIContext.Provider>
    );
};

export const useAI = () => {
    const context = useContext(AIContext);
    if (context === undefined) {
        // Fallback for safety, though it should be wrapped
        return { contextData: null, setContextData: () => {} };
    }
    return context;
};
