import { z } from "zod";

export const checkoutSchema = z.object({
  addressId: z.string().min(1),
  couponCode: z.string().min(1).max(50).optional(),
  paymentMethod: z.enum(["CASH_ON_DELIVERY", "CARD", "WALLET"]).default("CASH_ON_DELIVERY"),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
