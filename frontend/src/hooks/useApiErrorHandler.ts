import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { handleApiError } from '@/lib/api';

export const useApiErrorHandler = () => {
  const navigate = useNavigate();

  // Fix: `error: any` → `error: unknown`
  // handleApiError already accepts unknown internally, so no cast needed here.
  const handleError = useCallback(
    (error: unknown) => {
      handleApiError(error, navigate);
    },
    [navigate]
  );

  return handleError;
};