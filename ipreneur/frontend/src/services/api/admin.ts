import { apiClient } from "./client";
import type {
  AdminEvent,
  AdminOverview,
  AdminProjectListResponse,
  AdminSettings,
  AdminTransactionListResponse,
  AdminUserListResponse,
} from "@/types/admin";

export interface ListParams {
  page?: number;
  pageSize?: number;
}

export const adminApi = {
  getOverview: async (): Promise<AdminOverview> => {
    const { data } = await apiClient.get("/admin/overview");
    return data;
  },

  listEvents: async (params?: { type?: string; since?: string; limit?: number }): Promise<AdminEvent[]> => {
    const { data } = await apiClient.get("/admin/events", { params });
    return data;
  },

  listUsers: async (
    params?: ListParams & { search?: string; role?: string; createdSince?: string }
  ): Promise<AdminUserListResponse> => {
    const { data } = await apiClient.get("/admin/users", {
      params: { page: params?.page, page_size: params?.pageSize, search: params?.search, role: params?.role, created_since: params?.createdSince },
    });
    return data;
  },

  updateUser: async (
    userId: string,
    patch: { isActive?: boolean; role?: string; isBillingExempt?: boolean }
  ) => {
    const { data } = await apiClient.patch(`/admin/users/${userId}`, {
      is_active: patch.isActive,
      role: patch.role,
      is_billing_exempt: patch.isBillingExempt,
    });
    return data;
  },

  listTransactions: async (
    params?: ListParams & { userId?: string; deckType?: string; from?: string; to?: string }
  ): Promise<AdminTransactionListResponse> => {
    const { data } = await apiClient.get("/admin/transactions", {
      params: {
        page: params?.page, page_size: params?.pageSize,
        user_id: params?.userId, deck_type: params?.deckType,
        from: params?.from, to: params?.to,
      },
    });
    return data;
  },

  listProjects: async (
    params?: ListParams & { userId?: string; deckType?: string; status?: string; showDeleted?: boolean }
  ): Promise<AdminProjectListResponse> => {
    const { data } = await apiClient.get("/admin/projects", {
      params: {
        page: params?.page, page_size: params?.pageSize,
        user_id: params?.userId, deck_type: params?.deckType,
        status: params?.status, show_deleted: params?.showDeleted,
      },
    });
    return data;
  },

  softDeleteProject: async (projectId: string) => {
    const { data } = await apiClient.post(`/admin/projects/${projectId}/soft-delete`);
    return data;
  },

  getSettings: async (): Promise<AdminSettings> => {
    const { data } = await apiClient.get("/admin/settings");
    return data;
  },

  updateSetting: async (key: string, value: unknown): Promise<AdminSettings> => {
    const { data } = await apiClient.put(`/admin/settings/${key}`, { value });
    return data;
  },
};
