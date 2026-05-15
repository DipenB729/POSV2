"use client";

import { create } from "zustand";

export type CartItem = {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  lineTotal: number;
};

type CartDiscount = {
  code: string;
  amount: number;
};

export type PaymentMethod = "CASH" | "PHONEPE_QR" | "ESEWA_QR";

export type CartState = {
  items: CartItem[];
  customerId?: string;
  discount?: CartDiscount;
  note?: string;
  paymentMethod?: PaymentMethod;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, quantity: number, variantId?: string) => void;
  applyDiscount: (discount: CartDiscount) => void;
  setCustomer: (customerId?: string) => void;
  setNote: (note?: string) => void;
  setPaymentMethod: (paymentMethod?: PaymentMethod) => void;
  clearCart: () => void;
};

function lineTotal(item: Pick<CartItem, "quantity" | "unitPrice" | "taxRate">) {
  const subtotal = item.quantity * item.unitPrice;
  return roundMoney(subtotal + subtotal * (item.taxRate / 100));
}

function isSameLine(item: CartItem, productId: string, variantId?: string) {
  return item.productId === productId && (item.variantId ?? "") === (variantId ?? "");
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((line) => isSameLine(line, item.productId, item.variantId));

      if (!existing) {
        return {
          items: [
            ...state.items,
            {
              ...item,
              lineTotal: lineTotal(item),
            },
          ],
        };
      }

      return {
        items: state.items.map((line) => {
          if (!isSameLine(line, item.productId, item.variantId)) {
            return line;
          }

          const quantity = line.quantity + item.quantity;
          return {
            ...line,
            quantity,
            lineTotal: lineTotal({ ...line, quantity }),
          };
        }),
      };
    }),
  removeItem: (productId, variantId) =>
    set((state) => ({
      items: state.items.filter((line) => !isSameLine(line, productId, variantId)),
    })),
  updateQty: (productId, quantity, variantId) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((line) => !isSameLine(line, productId, variantId))
          : state.items.map((line) =>
              isSameLine(line, productId, variantId)
                ? {
                    ...line,
                    quantity,
                    lineTotal: lineTotal({ ...line, quantity }),
                  }
                : line,
            ),
    })),
  applyDiscount: (discount) => set({ discount }),
  setCustomer: (customerId) => set({ customerId }),
  setNote: (note) => set({ note }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  clearCart: () =>
    set({
      items: [],
      customerId: undefined,
      discount: undefined,
      note: undefined,
      paymentMethod: undefined,
    }),
}));

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
