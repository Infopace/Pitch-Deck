import { apiClient } from "./client";

export interface PlanInfo {
  plan: string;
  /** -1 means unlimited. */
  projectsLimit: number;
  exportsLimit: number;
  isActive: boolean;
}

export const billingApi = {
  getPlan: async (): Promise<PlanInfo> => {
    const { data } = await apiClient.get("/billing/plan");
    return data;
  },
};
