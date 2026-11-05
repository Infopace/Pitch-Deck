import { useMutation } from "@tanstack/react-query";
import { billingApi } from "@/services/api/billing";
import { openOrderCheckout } from "@/services/razorpay";

/** Buys one credit for a deck type: opens Razorpay checkout for its price,
 *  then verifies the signed result server-side. Resolves `true` once a paid
 *  credit is on the account, `false` if the user closed the window without
 *  paying. Shared by NewProjectPage (pay before first generation) and
 *  WorkspacePage (pay after a 402 from a retry). */
export function useDeckPayment() {
  return useMutation({
    mutationFn: async (opts: { deckType: string; deckLabel: string; name?: string; email?: string }) => {
      const order = await billingApi.createCreditOrder(opts.deckType);
      const result = await openOrderCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        deckLabel: opts.deckLabel,
        name: opts.name,
        email: opts.email,
      });
      if (!result) return false; // window closed without paying
      await billingApi.verifyCreditPayment(result);
      return true;
    },
  });
}
