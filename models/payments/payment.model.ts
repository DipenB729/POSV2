export type PaymentProvider = "cash" | "card" | "phonepe";
export type PaymentStatus = "pending" | "authorized" | "captured" | "failed" | "refunded";

export type Payment = {
  id: string;
  saleId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  providerReference?: string;
  createdAt: string;
};
