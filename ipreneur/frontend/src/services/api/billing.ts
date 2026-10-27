import { apiClient } from "./client";

export interface PlanInfo {
  plan: string;
  /** -1 means unlimited. */
  projectsLimit: number;
  exportsLimit: number;
  isActive: boolean;
}

export interface PlanSummary {
  name: string;
  price: string;
  features: string[];
}

export interface CheckoutSession {
  subscriptionId: string;
  keyId: string;
}

export interface PaymentResult {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export const billingApi = {
  createCheckout: async (): Promise<CheckoutSession> => {
    const { data } = await apiClient.post("/billing/checkout");
    return data;
  },
  verifyPayment: async (result: PaymentResult): Promise<void> => {
    await apiClient.post("/billing/verify", result);
  },
  cancel: async (): Promise<void> => {
    await apiClient.post("/billing/cancel");
  },
  listPlans: async (): Promise<PlanSummary[]> => {
    const { data } = await apiClient.get("/billing/plans");
    return data;
  },

  getPlan: async (): Promise<PlanInfo> => {
    const { data } = await apiClient.get("/billing/plan");
    return data;
  },
};
