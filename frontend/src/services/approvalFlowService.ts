import { api } from '@/lib/api';
import {
  Role,
  LeaveApprovalFlowRequest,
  LeaveApprovalFlowResponse,
} from '@/types';

export const approvalFlowService = {
  /** GET /api/auth/roles */
  getRoles: async (): Promise<Role[]> => {
    const res = await api.get<{ message: string; data: Role[] }>('/auth/roles');
    return res.data ?? [];
  },

  /**
   * GET /api/leaves/approver-flow
   * Returns every flow. Each item: { id, name, is_system, flow[] }
   */
  getFlow: async (): Promise<LeaveApprovalFlowResponse[]> => {
    const res = await api.get<{
      success: boolean;
      data: LeaveApprovalFlowResponse[];
    }>('/leaves/approver-flow');
    return res.data ?? [];
  },

  /**
   * POST /api/leaves/approver-flow
   * Body: { name, flow: [{stage_no, approver_role}] }
   */
  createFlow: async (payload: LeaveApprovalFlowRequest): Promise<LeaveApprovalFlowResponse> => {
    const res = await api.post<{
      success: boolean;
      message: string;
      data: LeaveApprovalFlowResponse;
    }>('/leaves/approver-flow', payload);
    return res.data;
  },

  /**
   * PUT /api/leaves/approver-flow/:id
   * id in URL — body: { name?, flow? }
   * Only allowed when is_system === false.
   */
  updateFlow: async (
    id: string,
    payload: Partial<LeaveApprovalFlowRequest>
  ): Promise<{ message: string }> => {
    return api.put<{ success: boolean; message: string }>(
      `/leaves/approver-flow/${id}`,
      payload
    );
  },

  /**
   * DELETE /api/leaves/approver-flow/:id
   * id in URL only — no body.
   * Only allowed when is_system === false.
   */
  deleteFlow: async (id: string): Promise<{ message: string }> => {
    return api.delete<{ success: boolean; message: string }>(
      `/leaves/approver-flow/${id}`
    );
  },
};
