import type { OrderPaymentResult } from "@/services/api/billing";

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let loading: Promise<void> | null = null;

/** Loads Razorpay's checkout script once, on first use. */
function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT_URL;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null; // allow a retry after a network failure
        reject(new Error("Could not load the payment window. Check your connection and try again."));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Opens Razorpay checkout for a one-time deck-type order. Resolves with the
 *  signed payment result, or null when the user closes the window without
 *  paying. */
export async function openOrderCheckout(opts: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  deckLabel: string;
  name?: string;
  email?: string;
}): Promise<OrderPaymentResult | null> {
  await loadScript();
  return new Promise((resolve) => {
    const rzp = new window.Razorpay!({
      key: opts.keyId,
      order_id: opts.orderId,
      amount: opts.amount,
      currency: opts.currency,
      name: "Mint",
      description: `${opts.deckLabel} deck`,
      prefill: { name: opts.name, email: opts.email },
      theme: { color: "#2563EB" },
      handler: (r: OrderPaymentResult) => resolve(r),
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.open();
  });
}
