CREATE OR REPLACE FUNCTION create_pending_phonepe_order(
  p_store_id UUID,
  p_customer_id UUID,
  p_discount_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL,
  p_discount_amount NUMERIC DEFAULT 0
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
  line_discount_total NUMERIC(10,2) := 0;
  grand_total NUMERIC(10,2) := 0;
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

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    item_product_id := (item->>'product_id')::UUID;
    item_variant_id := NULLIF(item->>'variant_id', '')::UUID;
    item_quantity := (item->>'quantity')::INT;
    item_discount := COALESCE((item->>'discount')::NUMERIC, 0);

    SELECT * INTO product_row
    FROM products
    WHERE id = item_product_id AND is_active = true AND deleted_at IS NULL;

    IF product_row.id IS NULL THEN
      RAISE EXCEPTION 'Product % not found or inactive', item_product_id;
    END IF;

    SELECT * INTO inventory_row
    FROM inventory_items
    WHERE product_id = item_product_id AND store_id = p_store_id AND deleted_at IS NULL
    FOR UPDATE;

    IF inventory_row.id IS NULL THEN
      RAISE EXCEPTION 'Inventory item missing for product % at store %', item_product_id, p_store_id;
    END IF;

    IF inventory_row.quantity < item_quantity THEN
      RAISE EXCEPTION 'Insufficient inventory for SKU %', product_row.sku;
    END IF;

    item_unit_price := COALESCE((item->>'unit_price')::NUMERIC, product_row.selling_price);
    item_tax_rate := COALESCE((item->>'tax_rate')::NUMERIC, product_row.tax_rate);
    item_name := product_row.name;
    item_sku := product_row.sku;

    IF item_variant_id IS NOT NULL THEN
      SELECT * INTO variant_row
      FROM product_variants
      WHERE id = item_variant_id AND product_id = product_row.id AND deleted_at IS NULL;

      IF variant_row.id IS NULL THEN
        RAISE EXCEPTION 'Variant % not found for product %', item_variant_id, item_product_id;
      END IF;

      item_name := product_row.name || ' - ' || variant_row.name;
      item_sku := variant_row.sku;
      item_unit_price := item_unit_price + COALESCE(variant_row.price_modifier, 0);
    END IF;

    item_line_subtotal := round(item_quantity * item_unit_price, 2);
    item_line_tax := round((item_line_subtotal - item_discount) * (item_tax_rate / 100), 2);
    item_line_total := item_line_subtotal - item_discount + item_line_tax;

    subtotal_total := subtotal_total + item_line_subtotal;
    tax_total := tax_total + item_line_tax;
    line_discount_total := line_discount_total + item_discount;
    grand_total := grand_total + item_line_total;
  END LOOP;

  grand_total := GREATEST(grand_total - COALESCE(p_discount_amount, 0), 0);

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
    'PENDING',
    subtotal_total,
    tax_total,
    line_discount_total + COALESCE(p_discount_amount, 0),
    grand_total,
    0,
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
    item_unit_price := COALESCE((item->>'unit_price')::NUMERIC, product_row.selling_price);
    item_tax_rate := COALESCE((item->>'tax_rate')::NUMERIC, product_row.tax_rate);
    item_name := product_row.name;
    item_sku := product_row.sku;

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
      item_unit_price,
      item_tax_rate,
      item_discount,
      item_line_total
    );
  END LOOP;

  INSERT INTO audit_logs (user_id, action, entity, entity_id, after)
  VALUES (actor_id, 'CREATE_PENDING_PHONEPE_ORDER', 'orders', created_order_id, jsonb_build_object('total_amount', grand_total));

  RETURN created_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION confirm_phonepe_order_payment(
  p_order_id UUID,
  p_payment_id UUID,
  p_reference TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row orders%ROWTYPE;
  payment_row payments%ROWTYPE;
  order_item_row order_items%ROWTYPE;
  inventory_row inventory_items%ROWTYPE;
BEGIN
  SELECT * INTO order_row FROM orders WHERE id = p_order_id FOR UPDATE;

  IF order_row.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF order_row.status = 'COMPLETED' THEN
    RETURN;
  END IF;

  SELECT * INTO payment_row FROM payments WHERE id = p_payment_id AND order_id = p_order_id FOR UPDATE;

  IF payment_row.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  FOR order_item_row IN SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    SELECT * INTO inventory_row
    FROM inventory_items
    WHERE product_id = order_item_row.product_id
    AND store_id = order_row.store_id
    AND deleted_at IS NULL
    FOR UPDATE;

    IF inventory_row.id IS NULL THEN
      RAISE EXCEPTION 'Inventory item missing for product %', order_item_row.product_id;
    END IF;

    IF inventory_row.quantity < order_item_row.quantity THEN
      RAISE EXCEPTION 'Insufficient inventory for SKU %', order_item_row.sku;
    END IF;

    UPDATE inventory_items
    SET quantity = quantity - order_item_row.quantity,
        updated_at = now()
    WHERE id = inventory_row.id
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
      -order_item_row.quantity,
      'PhonePe payment confirmed',
      p_order_id,
      order_row.cashier_id
    );
  END LOOP;

  UPDATE payments
  SET status = 'COMPLETED',
      reference = COALESCE(p_reference, reference),
      metadata = COALESCE(p_metadata, metadata),
      updated_at = now()
  WHERE id = p_payment_id;

  UPDATE orders
  SET status = 'COMPLETED',
      amount_paid = total_amount,
      change_due = 0,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO audit_logs (user_id, action, entity, entity_id, after)
  VALUES (order_row.cashier_id, 'CONFIRM_PHONEPE_PAYMENT', 'orders', p_order_id, jsonb_build_object('payment_id', p_payment_id));
END;
$$;
