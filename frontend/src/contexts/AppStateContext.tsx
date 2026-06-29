import { createContext, useContext } from 'react';

export interface AppStateContextType {
  invalidateLeaves: () => void;
  invalidateEmployees: () => void;
  invalidateBalances: (employeeId?: string) => void;
  invalidateSettings: () => void;
  invalidateAll: () => void;
}

export const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};