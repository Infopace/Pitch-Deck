import { apiClient } from "./client";

export interface PricingRow {
  key: string;
  label: string;
  priceInr: number;
}

export interface CreditOrder {
  orderId: string;
  keyId: string;
  amount: number; // paise
  currency: string;
  deckType: string;
  priceInr: number;
}

export interface OrderPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface CreditRow {
  id: string;
  deckType: string;
  deckLabel: string;
  amountInr: number;
  status: "created" | "paid" | "consumed";
  createdAt: string;
  projectId: string | null;
}

export const billingApi = {
  getPricing: async (): Promise<PricingRow[]> => {
    const { data } = await apiClient.get("/billing/pricing");
    return data;
  },
  listCredits: async (): Promise<CreditRow[]> => {
    const { data } = await apiClient.get("/billing/credits");
    return data;
  },
  createCreditOrder: async (deckType: string): Promise<CreditOrder> => {
    const { data } = await apiClient.post("/billing/credits/order", { deck_type: deckType });
    return data;
  },
  verifyCreditPayment: async (result: OrderPaymentResult): Promise<{ deckType: string; status: string }> => {
    const { data } = await apiClient.post("/billing/credits/verify", result);
    return data;
  },
};
