-- Phase 1 report data capture layer.
-- Existing checkout tables remain the write source:
-- orders -> sales, order_items -> sale_items, inventory_movements -> stock_movements.

CREATE TABLE IF NOT EXISTS expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES stores(id),
  category       TEXT NOT NULL,
  description    TEXT,
  amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method payment_method,
  reference      TEXT,
  incurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id  UUID NOT NULL REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_expenses_store_created ON expenses(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by_id);

DROP TRIGGER IF EXISTS expenses_set_updated_at ON expenses;
CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expenses_store_read ON expenses;
CREATE POLICY expenses_store_read ON expenses
  FOR SELECT USING (
    store_id = current_profile_store_id()
    OR current_profile_role() = 'SUPER_ADMIN'
  );

DROP POLICY IF EXISTS expenses_admin_write ON expenses;
CREATE POLICY expenses_admin_write ON expenses
  FOR ALL USING (
    current_profile_role() IN ('SUPER_ADMIN','ADMIN','MANAGER')
    AND (current_profile_role() = 'SUPER_ADMIN' OR store_id = current_profile_store_id())
  )
  WITH CHECK (
    current_profile_role() IN ('SUPER_ADMIN','ADMIN','MANAGER')
    AND (current_profile_role() = 'SUPER_ADMIN' OR store_id = current_profile_store_id())
  );

CREATE OR REPLACE VIEW sales AS
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
  tax_amount,
  discount_amount,
  total_amount,
  amount_paid,
  change_due,
  notes,
  created_at,
  updated_at,
  deleted_at
FROM orders;

CREATE OR REPLACE VIEW sale_items AS
SELECT
  oi.id,
  oi.id AS sale_item_id,
  oi.order_id AS sale_id,
  oi.order_id,
  o.store_id,
  o.cashier_id,
  oi.product_id,
  oi.variant_id,
  oi.name,
  oi.sku,
  oi.quantity,
  oi.unit_price,
  oi.tax_rate,
  oi.discount,
  oi.line_total,
  oi.created_at
FROM order_items oi
JOIN orders o ON o.id = oi.order_id;

CREATE OR REPLACE VIEW stock_movements AS
SELECT
  im.id,
  im.id AS stock_movement_id,
  ii.store_id,
  ii.product_id,
  im.inventory_item_id,
  CASE im.type
    WHEN 'SALE' THEN 'stock_out'
    WHEN 'PURCHASE_RECEIVED' THEN 'stock_in'
    WHEN 'ADJUSTMENT' THEN 'adjustment'
    WHEN 'RETURN' THEN 'reversal'
    WHEN 'TRANSFER_IN' THEN 'stock_in'
    WHEN 'TRANSFER_OUT' THEN 'stock_out'
    WHEN 'DAMAGE' THEN 'stock_out'
    ELSE lower(im.type::text)
  END AS movement_type,
  im.type AS source_type,
  im.quantity,
  im.reason,
  im.reference_id,
  im.performed_by_id AS user_id,
  im.created_at
FROM inventory_movements im
JOIN inventory_items ii ON ii.id = im.inventory_item_id;

CREATE OR REPLACE VIEW refunds_or_voids AS
SELECT
  r.id,
  r.id AS event_id,
  'refund'::TEXT AS event_type,
  r.order_id AS sale_id,
  o.store_id,
  o.cashier_id,
  r.amount,
  r.reason,
  r.method::TEXT AS method,
  r.metadata,
  r.created_at
FROM refunds r
JOIN orders o ON o.id = r.order_id
UNION ALL
SELECT
  o.id,
  o.id AS event_id,
  'void'::TEXT AS event_type,
  o.id AS sale_id,
  o.store_id,
  o.cashier_id,
  o.total_amount AS amount,
  COALESCE(o.notes, 'Cancelled order') AS reason,
  NULL::TEXT AS method,
  NULL::JSONB AS metadata,
  o.updated_at AS created_at
FROM orders o
WHERE o.status = 'CANCELLED';

CREATE OR REPLACE FUNCTION create_expense(
  p_store_id UUID,
  p_category TEXT,
  p_description TEXT,
  p_amount NUMERIC,
  p_payment_method payment_method DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_incurred_at TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  actor_role user_role;
  actor_store_id UUID;
  created_expense_id UUID;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role, store_id INTO actor_role, actor_store_id
  FROM profiles
  WHERE id = actor_id AND is_active = true AND deleted_at IS NULL;

  IF actor_role NOT IN ('SUPER_ADMIN','ADMIN','MANAGER') THEN
    RAISE EXCEPTION 'Insufficient permissions to create expenses';
  END IF;

  IF actor_role <> 'SUPER_ADMIN' AND actor_store_id <> p_store_id THEN
    RAISE EXCEPTION 'Cannot create expenses outside assigned store';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be positive';
  END IF;

  INSERT INTO expenses (
    store_id,
    category,
    description,
    amount,
    payment_method,
    reference,
    incurred_at,
    created_by_id
  )
  VALUES (
    p_store_id,
    p_category,
    p_description,
    p_amount,
    p_payment_method,
    p_reference,
    COALESCE(p_incurred_at, now()),
    actor_id
  )
  RETURNING id INTO created_expense_id;

  INSERT INTO audit_logs (user_id, action, entity, entity_id, after)
  VALUES (
    actor_id,
    'CREATE_EXPENSE',
    'expenses',
    created_expense_id,
    jsonb_build_object('amount', p_amount, 'category', p_category)
  );

  RETURN created_expense_id;
END;
$$;
