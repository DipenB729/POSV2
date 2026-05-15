-- Phase 2: data validation for report-safe calculations.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2);

UPDATE order_items oi
SET cost_price = p.cost_price,
    selling_price = p.selling_price
FROM products p
WHERE p.id = oi.product_id
AND (oi.cost_price IS NULL OR oi.selling_price IS NULL);

ALTER TABLE order_items
  ALTER COLUMN cost_price SET NOT NULL,
  ALTER COLUMN selling_price SET NOT NULL;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_required_totals_valid,
  ADD CONSTRAINT orders_required_totals_valid CHECK (
    subtotal >= 0
    AND tax_amount >= 0
    AND discount_amount >= 0
    AND total_amount >= 0
    AND amount_paid >= 0
    AND change_due >= 0
    AND discount_amount <= subtotal + tax_amount
  );

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_report_values_valid,
  ADD CONSTRAINT order_items_report_values_valid CHECK (
    product_id IS NOT NULL
    AND quantity > 0
    AND unit_price > 0
    AND cost_price >= 0
    AND selling_price > 0
    AND tax_rate >= 0
    AND tax_rate <= 100
    AND discount >= 0
    AND discount <= quantity * unit_price
    AND line_total >= 0
  );

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_amount_valid,
  ADD CONSTRAINT payments_amount_valid CHECK (amount > 0);

ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_quantity_integer_valid,
  ADD CONSTRAINT inventory_quantity_integer_valid CHECK (quantity IS NOT NULL);

CREATE OR REPLACE FUNCTION populate_order_item_report_prices()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_row products%ROWTYPE;
BEGIN
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'Sale item requires product_id';
  END IF;

  SELECT * INTO product_row
  FROM products
  WHERE id = NEW.product_id AND deleted_at IS NULL;

  IF product_row.id IS NULL THEN
    RAISE EXCEPTION 'Sale item product % not found', NEW.product_id;
  END IF;

  NEW.cost_price := COALESCE(NEW.cost_price, product_row.cost_price);
  NEW.selling_price := COALESCE(NEW.selling_price, product_row.selling_price);

  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Sale item quantity must be positive';
  END IF;

  IF NEW.unit_price <= 0 OR NEW.cost_price < 0 OR NEW.selling_price <= 0 THEN
    RAISE EXCEPTION 'Sale item requires valid cost_price and selling_price';
  END IF;

  IF COALESCE(NEW.discount, 0) < 0 OR COALESCE(NEW.discount, 0) > NEW.quantity * NEW.unit_price THEN
    RAISE EXCEPTION 'Sale item discount is invalid';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_populate_report_prices ON order_items;
CREATE TRIGGER order_items_populate_report_prices
  BEFORE INSERT OR UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION populate_order_item_report_prices();

CREATE OR REPLACE FUNCTION validate_inventory_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allow_backorder BOOLEAN := COALESCE(current_setting('app.allow_backorder', true), 'false') = 'true';
  actor_role user_role := current_profile_role();
BEGIN
  IF NEW.quantity < 0 AND NOT (allow_backorder AND actor_role IN ('SUPER_ADMIN','ADMIN','MANAGER')) THEN
    RAISE EXCEPTION 'Stock quantity cannot become negative';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_items_validate_quantity ON inventory_items;
CREATE TRIGGER inventory_items_validate_quantity
  BEFORE INSERT OR UPDATE OF quantity ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION validate_inventory_quantity();

CREATE OR REPLACE FUNCTION validate_order_payment_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order_id UUID;
  order_row orders%ROWTYPE;
  completed_payment_total NUMERIC(10,2);
BEGIN
  IF TG_TABLE_NAME = 'payments' THEN
    target_order_id := NEW.order_id;
  ELSE
    target_order_id := NEW.id;
  END IF;

  SELECT * INTO order_row
  FROM orders
  WHERE id = target_order_id;

  IF order_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(sum(amount), 0)
  INTO completed_payment_total
  FROM payments
  WHERE order_id = order_row.id
  AND status = 'COMPLETED';

  IF completed_payment_total > order_row.total_amount THEN
    RAISE EXCEPTION 'Completed payments exceed order total';
  END IF;

  IF order_row.status = 'COMPLETED' AND completed_payment_total <> order_row.total_amount THEN
    RAISE EXCEPTION 'Completed sale payments must equal grand total';
  END IF;

  IF order_row.status IN ('REFUNDED','PARTIALLY_REFUNDED') AND completed_payment_total < order_row.total_amount THEN
    RAISE EXCEPTION 'Refunded sale must first have completed payment equal to grand total';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS orders_validate_payment_balance ON orders;
CREATE CONSTRAINT TRIGGER orders_validate_payment_balance
  AFTER INSERT OR UPDATE OF status, total_amount, amount_paid ON orders
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION validate_order_payment_balance();

DROP TRIGGER IF EXISTS payments_validate_order_balance ON payments;
CREATE CONSTRAINT TRIGGER payments_validate_order_balance
  AFTER INSERT OR UPDATE OF amount, status ON payments
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION validate_order_payment_balance();

DROP VIEW IF EXISTS sale_items;
CREATE VIEW sale_items AS
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
  oi.cost_price,
  oi.selling_price,
  oi.unit_price,
  oi.tax_rate,
  oi.discount,
  oi.line_total,
  oi.created_at
FROM order_items oi
JOIN orders o ON o.id = oi.order_id;

CREATE OR REPLACE FUNCTION create_pos_order(
  p_store_id UUID,
  p_customer_id UUID,
  p_discount_id UUID,
  p_items JSONB,
  p_payments JSONB,
  p_notes TEXT DEFAULT NULL
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
  created_order_id UUID;
  item JSONB;
  payment JSONB;
  product_row products%ROWTYPE;
  variant_row product_variants%ROWTYPE;
  inventory_row inventory_items%ROWTYPE;
  item_product_id UUID;
  item_variant_id UUID;
  item_quantity INT;
  item_unit_price NUMERIC(10,2);
  item_tax_rate NUMERIC(5,2);
  item_discount NUMERIC(10,2);
  item_name TEXT;
  item_sku TEXT;
  item_line_subtotal NUMERIC(10,2);
  item_line_tax NUMERIC(10,2);
  item_line_total NUMERIC(10,2);
  subtotal_total NUMERIC(10,2) := 0;
  tax_total NUMERIC(10,2) := 0;
  discount_total NUMERIC(10,2) := 0;
  grand_total NUMERIC(10,2) := 0;
  paid_total NUMERIC(10,2) := 0;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role, store_id INTO actor_role, actor_store_id
  FROM profiles
  WHERE id = actor_id AND is_active = true AND deleted_at IS NULL;

  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Active profile required';
  END IF;

  IF actor_role <> 'SUPER_ADMIN' AND actor_store_id <> p_store_id THEN
    RAISE EXCEPTION 'Cannot create orders outside assigned store';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order requires at least one item';
  END IF;

  IF jsonb_typeof(p_payments) <> 'array' OR jsonb_array_length(p_payments) = 0 THEN
    RAISE EXCEPTION 'Checkout requires payment information';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    item_product_id := (item->>'product_id')::UUID;
    item_variant_id := NULLIF(item->>'variant_id', '')::UUID;
    item_quantity := (item->>'quantity')::INT;
    item_discount := COALESCE((item->>'discount')::NUMERIC, 0);

    IF item_product_id IS NULL OR item_quantity <= 0 THEN
      RAISE EXCEPTION 'Sale item requires product_id and positive quantity';
    END IF;

    SELECT * INTO product_row FROM products
    WHERE id = item_product_id AND is_active = true AND deleted_at IS NULL;

    IF product_row.id IS NULL THEN
      RAISE EXCEPTION 'Product % not found or inactive', item_product_id;
    END IF;

    item_name := product_row.name;
    item_sku := product_row.sku;
    item_unit_price := COALESCE((item->>'unit_price')::NUMERIC, product_row.selling_price);
    item_tax_rate := COALESCE((item->>'tax_rate')::NUMERIC, product_row.tax_rate);

    IF item_unit_price <= 0 OR item_tax_rate < 0 OR item_tax_rate > 100 THEN
      RAISE EXCEPTION 'Invalid item price or tax rate';
    END IF;

    IF item_variant_id IS NOT NULL THEN
      SELECT * INTO variant_row FROM product_variants
      WHERE id = item_variant_id AND product_id = product_row.id AND deleted_at IS NULL;

      IF variant_row.id IS NULL THEN
        RAISE EXCEPTION 'Variant % not found for product %', item_variant_id, item_product_id;
      END IF;

      item_name := product_row.name || ' - ' || variant_row.name;
      item_sku := variant_row.sku;
      item_unit_price := item_unit_price + COALESCE(variant_row.price_modifier, 0);
    END IF;

    SELECT * INTO inventory_row
    FROM inventory_items
    WHERE product_id = item_product_id AND store_id = p_store_id AND deleted_at IS NULL
    FOR UPDATE;

    IF inventory_row.id IS NULL THEN
      RAISE EXCEPTION 'Inventory item missing for product % at store %', item_product_id, p_store_id;
    END IF;

    IF inventory_row.quantity < item_quantity THEN
      RAISE EXCEPTION 'Insufficient inventory for SKU %', item_sku;
    END IF;

    item_line_subtotal := round(item_quantity * item_unit_price, 2);

    IF item_discount < 0 OR item_discount > item_line_subtotal THEN
      RAISE EXCEPTION 'Invalid discount for SKU %', item_sku;
    END IF;

    item_line_tax := round((item_line_subtotal - item_discount) * (item_tax_rate / 100), 2);
    item_line_total := item_line_subtotal - item_discount + item_line_tax;

    subtotal_total := subtotal_total + item_line_subtotal;
    tax_total := tax_total + item_line_tax;
    discount_total := discount_total + item_discount;
    grand_total := grand_total + item_line_total;
  END LOOP;

  SELECT COALESCE(sum((value->>'amount')::NUMERIC), 0)
  INTO paid_total
  FROM jsonb_array_elements(p_payments);

  IF paid_total <> grand_total THEN
    RAISE EXCEPTION 'Payment amount must equal grand total';
  END IF;

  INSERT INTO orders (
    order_number,
    store_id,
    cashier_id,
    customer_id,
    discount_id,
    status,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    amount_paid,
    change_due,
    notes
  )
  VALUES (
    next_order_number(p_store_id),
    p_store_id,
    actor_id,
    p_customer_id,
    p_discount_id,
    'COMPLETED',
    subtotal_total,
    tax_total,
    discount_total,
    grand_total,
    paid_total,
    0,
    p_notes
  )
  RETURNING id INTO created_order_id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    item_product_id := (item->>'product_id')::UUID;
    item_variant_id := NULLIF(item->>'variant_id', '')::UUID;
    item_quantity := (item->>'quantity')::INT;
    item_discount := COALESCE((item->>'discount')::NUMERIC, 0);

    SELECT * INTO product_row FROM products WHERE id = item_product_id;
    item_name := product_row.name;
    item_sku := product_row.sku;
    item_unit_price := COALESCE((item->>'unit_price')::NUMERIC, product_row.selling_price);
    item_tax_rate := COALESCE((item->>'tax_rate')::NUMERIC, product_row.tax_rate);

    IF item_variant_id IS NOT NULL THEN
      SELECT * INTO variant_row FROM product_variants WHERE id = item_variant_id;
      item_name := product_row.name || ' - ' || variant_row.name;
      item_sku := variant_row.sku;
      item_unit_price := item_unit_price + COALESCE(variant_row.price_modifier, 0);
    END IF;

    item_line_subtotal := round(item_quantity * item_unit_price, 2);
    item_line_tax := round((item_line_subtotal - item_discount) * (item_tax_rate / 100), 2);
    item_line_total := item_line_subtotal - item_discount + item_line_tax;

    INSERT INTO order_items (
      order_id,
      product_id,
      variant_id,
      name,
      sku,
      quantity,
      cost_price,
      selling_price,
      unit_price,
      tax_rate,
      discount,
      line_total
    )
    VALUES (
      created_order_id,
      item_product_id,
      item_variant_id,
      item_name,
      item_sku,
      item_quantity,
      product_row.cost_price,
      product_row.selling_price,
      item_unit_price,
      item_tax_rate,
      item_discount,
      item_line_total
    );

    UPDATE inventory_items
    SET quantity = quantity - item_quantity
    WHERE product_id = item_product_id AND store_id = p_store_id
    RETURNING * INTO inventory_row;

    INSERT INTO inventory_movements (
      inventory_item_id,
      type,
      quantity,
      reason,
      reference_id,
      performed_by_id
    )
    VALUES (
      inventory_row.id,
      'SALE',
      -item_quantity,
      'POS order sale',
      created_order_id,
      actor_id
    );
  END LOOP;

  FOR payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO payments (order_id, method, amount, status, reference, metadata)
    VALUES (
      created_order_id,
      (payment->>'method')::payment_method,
      (payment->>'amount')::NUMERIC,
      COALESCE((payment->>'status')::payment_status, 'COMPLETED'::payment_status),
      payment->>'reference',
      payment->'metadata'
    );
  END LOOP;

  INSERT INTO audit_logs (user_id, action, entity, entity_id, after)
  VALUES (actor_id, 'CREATE_POS_ORDER', 'orders', created_order_id, jsonb_build_object('total_amount', grand_total));

  RETURN created_order_id;
END;
$$;
