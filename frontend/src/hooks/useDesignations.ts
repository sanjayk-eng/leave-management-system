import { useState, useEffect, useCallback } from 'react';
import { designationService, CreateDesignationRequest, UpdateDesignationRequest } from '@/services/designationService';
import { Designation } from '@/types';
import { useApiErrorHandler } from './useApiErrorHandler';

export const useDesignations = () => {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleApiError = useApiErrorHandler();

  const fetchDesignations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await designationService.getAll();
      setDesignations(data || []);
    } catch (err: unknown) {
      handleApiError(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch designations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [handleApiError]);

  const createDesignation = useCallback(async (data: CreateDesignationRequest) => {
    setLoading(true);
    setError(null);
    try {
      await designationService.create(data);
      await fetchDesignations();
      return true;
    } catch (err: unknown) {
      handleApiError(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create designation';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchDesignations, handleApiError]);

  const updateDesignation = useCallback(async (id: string, data: UpdateDesignationRequest) => {
    setLoading(true);
    setError(null);
    try {
      await designationService.update(id, data);
      await fetchDesignations();
      return true;
    } catch (err: unknown) {
      handleApiError(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update designation';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchDesignations, handleApiError]);

  const deleteDesignation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await designationService.delete(id);
      await fetchDesignations();
      return true;
    } catch (err: unknown) {
      handleApiError(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete designation';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchDesignations, handleApiError]);

  useEffect(() => {
    fetchDesignations();
  }, [fetchDesignations]);

  return {
    designations,
    loading,
    error,
    fetchDesignations,
    createDesignation,
    updateDesignation,
    deleteDesignation,
  };
};