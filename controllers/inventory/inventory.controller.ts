type StockTrackedProduct = {
  stockOnHand: number;
  reorderPoint: number;
};

export function getLowStockProducts<T extends StockTrackedProduct>(products: T[]) {
  return products.filter((product) => product.stockOnHand <= product.reorderPoint);
}
