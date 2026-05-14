import type { CreateSaleInput } from "@/schemas/sale.schema";

export type SaleStatus = "draft" | "paid" | "refunded" | "void";

export type Sale = {
  id: string;
  saleNumber: string;
  cashierId: string;
  customerId?: string;
  status: SaleStatus;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  createdAt: string;
};

export function calculateSaleTotals(input: CreateSaleInput) {
  return input.lines.reduce(
    (totals, line) => {
      const lineSubtotal = line.quantity * line.unitPrice;
      const lineTax = lineSubtotal * line.taxRate;

      return {
        subtotal: totals.subtotal + lineSubtotal,
        taxTotal: totals.taxTotal + lineTax,
        grandTotal: totals.grandTotal + lineSubtotal + lineTax,
      };
    },
    { subtotal: 0, taxTotal: 0, grandTotal: 0 },
  );
}
