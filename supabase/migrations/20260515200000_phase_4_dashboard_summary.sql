-- Phase 4: owner/admin dashboard summary layer.

CREATE OR REPLACE VIEW report_dashboard_daily_sales AS
SELECT
  date_trunc('day', s.created_at)::date AS sales_date,
  s.store_id,
  COUNT(s.id)::INT AS orders,
  COALESCE(SUM(s.grand_total), 0)::NUMERIC(12,2) AS total_sales,
  COALESCE(SUM(s.subtotal - s.discount_total + s.tax_total), 0)::NUMERIC(12,2) AS net_sales,
  COALESCE(SUM(s.discount_total), 0)::NUMERIC(12,2) AS discount_given,
  COALESCE(SUM(s.tax_total), 0)::NUMERIC(12,2) AS tax_collected
FROM sales s
WHERE s.deleted_at IS NULL
AND s.status IN ('COMPLETED','PARTIALLY_REFUNDED','REFUNDED')
GROUP BY date_trunc('day', s.created_at)::date, s.store_id;

CREATE OR REPLACE VIEW report_dashboard_top_products AS
SELECT
  si.store_id,
  si.product_id,
  si.name,
  si.sku,
  COALESCE(SUM(si.quantity), 0)::INT AS quantity_sold,
  COALESCE(SUM(si.line_total), 0)::NUMERIC(12,2) AS sales_total,
  COALESCE(SUM((si.selling_price - si.cost_price) * si.quantity), 0)::NUMERIC(12,2) AS profit
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE s.deleted_at IS NULL
AND s.status IN ('COMPLETED','PARTIALLY_REFUNDED','REFUNDED')
GROUP BY si.store_id, si.product_id, si.name, si.sku;

CREATE OR REPLACE VIEW report_dashboard_payment_breakdown AS
SELECT
  s.store_id,
  p.method,
  COUNT(p.id)::INT AS payment_count,
  COALESCE(SUM(p.amount), 0)::NUMERIC(12,2) AS payment_total
FROM payments p
JOIN sales s ON s.id = p.order_id
WHERE p.status = 'COMPLETED'
GROUP BY s.store_id, p.method;

CREATE OR REPLACE VIEW report_dashboard_stock_alerts AS
SELECT
  ii.store_id,
  ii.product_id,
  p.name,
  p.sku,
  ii.quantity AS stock_qty,
  ii.reorder_point AS low_stock_threshold,
  CASE WHEN ii.quantity <= 0 THEN 'out_of_stock' ELSE 'low_stock' END AS alert_type
FROM inventory_items ii
JOIN products p ON p.id = ii.product_id
WHERE ii.deleted_at IS NULL
AND ii.quantity <= ii.reorder_point;
