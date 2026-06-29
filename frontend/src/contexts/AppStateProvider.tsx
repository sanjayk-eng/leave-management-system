import { ReactNode, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppStateContext } from './AppStateContext';

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  const invalidateLeaves = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leaves'] });
  }, [queryClient]);

  const invalidateEmployees = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  }, [queryClient]);

  const invalidateBalances = useCallback((employeeId?: string) => {
    if (employeeId) {
      queryClient.invalidateQueries({ queryKey: ['leaveBalances', employeeId] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
    }
  }, [queryClient]);

  const invalidateSettings = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['settings'] });
    queryClient.invalidateQueries({ queryKey: ['holidays'] });
  }, [queryClient]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  return (
    <AppStateContext.Provider
      value={{
        invalidateLeaves,
        invalidateEmployees,
        invalidateBalances,
        invalidateSettings,
        invalidateAll,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};