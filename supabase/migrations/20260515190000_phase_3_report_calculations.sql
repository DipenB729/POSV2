-- Phase 3: report calculation layer.
-- These views convert validated raw records into reusable business totals.

DROP VIEW IF EXISTS sales CASCADE;
CREATE VIEW sales AS
SELECT
  id,
  id AS sale_id,
  order_number AS sale_number,
  store_id,
  cashier_id,
  cashier_id AS user_id,
  customer_id,
  status,
  subtotal,
  subtotal AS subtotal_amount,
  tax_amount,
  tax_amount AS tax_total,
  discount_amount,
  discount_amount AS discount_total,
  total_amount,
  total_amount AS grand_total,
  amount_paid,
  change_due,
  notes,
  created_at,
  updated_at,
  deleted_at
FROM orders;

CREATE OR REPLACE VIEW report_sales_metrics AS
SELECT
  store_id,
  cashier_id,
  date_trunc('day', created_at)::date AS report_date,
  COUNT(id)::INT AS total_orders,
  COALESCE(SUM(total_amount), 0)::NUMERIC(12,2) AS total_sales,
  COALESCE(SUM(subtotal - discount_amount + tax_amount), 0)::NUMERIC(12,2) AS net_sales,
  COALESCE(SUM(discount_amount), 0)::NUMERIC(12,2) AS discount_given,
  COALESCE(SUM(tax_amount), 0)::NUMERIC(12,2) AS tax_collected,
  CASE
    WHEN COUNT(id) = 0 THEN 0
    ELSE ROUND((SUM(total_amount) / COUNT(id))::NUMERIC, 2)
  END AS average_bill_value
FROM sales
WHERE deleted_at IS NULL
AND status IN ('COMPLETED','PARTIALLY_REFUNDED','REFUNDED')
GROUP BY store_id, cashier_id, date_trunc('day', created_at)::date;

CREATE OR REPLACE VIEW report_sales_totals AS
SELECT
  COALESCE(SUM(total_amount), 0)::NUMERIC(12,2) AS total_sales,
  COALESCE(SUM(subtotal - discount_amount + tax_amount), 0)::NUMERIC(12,2) AS net_sales,
  COUNT(id)::INT AS total_orders,
  CASE
    WHEN COUNT(id) = 0 THEN 0
    ELSE ROUND((SUM(total_amount) / COUNT(id))::NUMERIC, 2)
  END AS average_bill_value,
  COALESCE(SUM(discount_amount), 0)::NUMERIC(12,2) AS discount_given,
  COALESCE(SUM(tax_amount), 0)::NUMERIC(12,2) AS tax_collected
FROM sales
WHERE deleted_at IS NULL
AND status IN ('COMPLETED','PARTIALLY_REFUNDED','REFUNDED');

CREATE OR REPLACE VIEW report_product_sales AS
SELECT
  si.product_id,
  si.name,
  si.sku,
  si.store_id,
  COALESCE(SUM(si.quantity), 0)::INT AS product_quantity_sold,
  COALESCE(SUM(si.line_total), 0)::NUMERIC(12,2) AS total_sales,
  COALESCE(SUM(si.discount), 0)::NUMERIC(12,2) AS discount_given,
  COALESCE(SUM((si.selling_price - si.cost_price) * si.quantity), 0)::NUMERIC(12,2) AS gross_profit,
  COALESCE(SUM(si.line_total - ((si.quantity * si.unit_price - si.discount))), 0)::NUMERIC(12,2) AS tax_collected
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE s.deleted_at IS NULL
AND s.status IN ('COMPLETED','PARTIALLY_REFUNDED','REFUNDED')
GROUP BY si.product_id, si.name, si.sku, si.store_id;

CREATE OR REPLACE VIEW report_payment_totals AS
SELECT
  p.method,
  s.store_id,
  COUNT(p.id)::INT AS payment_count,
  COALESCE(SUM(p.amount), 0)::NUMERIC(12,2) AS payment_total
FROM payments p
JOIN sales s ON s.id = p.order_id
WHERE p.status = 'COMPLETED'
AND s.deleted_at IS NULL
GROUP BY p.method, s.store_id;

CREATE OR REPLACE VIEW report_stock_summary AS
SELECT
  ii.store_id,
  ii.product_id,
  p.name,
  p.sku,
  ii.quantity AS current_stock,
  COALESCE(SUM(sm.quantity), 0)::INT AS stock_movement_quantity,
  ii.updated_at
FROM inventory_items ii
JOIN products p ON p.id = ii.product_id
LEFT JOIN stock_movements sm ON sm.inventory_item_id = ii.id
WHERE ii.deleted_at IS NULL
GROUP BY ii.store_id, ii.product_id, p.name, p.sku, ii.quantity, ii.updated_at;

CREATE OR REPLACE VIEW report_expense_totals AS
SELECT
  store_id,
  category,
  payment_method,
  COUNT(id)::INT AS expense_count,
  COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS expense_total,
  MAX(created_at) AS last_entry_at
FROM expenses
WHERE deleted_at IS NULL
GROUP BY store_id, category, payment_method;

CREATE OR REPLACE VIEW report_business_summary AS
SELECT
  (SELECT total_sales FROM report_sales_totals) AS total_sales,
  (SELECT net_sales FROM report_sales_totals) AS net_sales,
  (SELECT total_orders FROM report_sales_totals) AS total_orders,
  (SELECT average_bill_value FROM report_sales_totals) AS average_bill_value,
  (SELECT discount_given FROM report_sales_totals) AS discount_given,
  (SELECT tax_collected FROM report_sales_totals) AS tax_collected,
  COALESCE((SELECT SUM(gross_profit) FROM report_product_sales), 0)::NUMERIC(12,2) AS gross_profit,
  COALESCE((SELECT SUM(product_quantity_sold) FROM report_product_sales), 0)::INT AS product_quantity_sold,
  COALESCE((SELECT SUM(payment_total) FROM report_payment_totals), 0)::NUMERIC(12,2) AS payment_total,
  COALESCE((SELECT SUM(expense_total) FROM report_expense_totals), 0)::NUMERIC(12,2) AS expense_total,
  COALESCE((SELECT SUM(current_stock) FROM report_stock_summary), 0)::INT AS current_stock;
