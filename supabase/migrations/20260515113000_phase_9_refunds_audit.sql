CREATE OR REPLACE FUNCTION create_order_refund_v2(
  p_order_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_method payment_method,
  p_items JSONB DEFAULT '[]',
  p_metadata JSONB DEFAULT NULL,
  p_ip TEXT DEFAULT NULL
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
  order_row orders%ROWTYPE;
  refunded_total NUMERIC(10,2);
  paid_total NUMERIC(10,2);
  created_refund_id UUID;
  item JSONB;
  order_item_row order_items%ROWTYPE;
  inventory_row inventory_items%ROWTYPE;
  return_quantity INT;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role, store_id INTO actor_role, actor_store_id
  FROM profiles
  WHERE id = actor_id AND is_active = true AND deleted_at IS NULL;

  SELECT * INTO order_row FROM orders WHERE id = p_order_id FOR UPDATE;

  IF order_row.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF actor_role <> 'SUPER_ADMIN' AND actor_store_id <> order_row.store_id THEN
    RAISE EXCEPTION 'Cannot refund orders outside assigned store';
  END IF;

  IF actor_role NOT IN ('SUPER_ADMIN','ADMIN','MANAGER') THEN
    RAISE EXCEPTION 'Insufficient permissions to refund';
  END IF;

  SELECT COALESCE(sum(amount), 0)
  INTO paid_total
  FROM payments
  WHERE order_id = p_order_id AND status = 'COMPLETED';

  SELECT COALESCE(sum(amount), 0)
  INTO refunded_total
  FROM refunds
  WHERE order_id = p_order_id;

  IF p_amount <= 0 OR p_amount > paid_total - refunded_total THEN
    RAISE EXCEPTION 'Refund amount exceeds refundable balance';
  END IF;

  INSERT INTO refunds (order_id, amount, reason, method, metadata)
  VALUES (p_order_id, p_amount, p_reason, p_method, p_metadata)
  RETURNING id INTO created_refund_id;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    SELECT * INTO order_item_row
    FROM order_items
    WHERE id = (item->>'order_item_id')::UUID AND order_id = p_order_id;

    IF order_item_row.id IS NULL THEN
      RAISE EXCEPTION 'Order item not found';
    END IF;

    return_quantity := (item->>'quantity')::INT;

    IF return_quantity <= 0 OR return_quantity > order_item_row.quantity THEN
      RAISE EXCEPTION 'Invalid return quantity for order item %', order_item_row.id;
    END IF;

    SELECT * INTO inventory_row
    FROM inventory_items
    WHERE product_id = order_item_row.product_id
    AND store_id = order_row.store_id
    AND deleted_at IS NULL
    FOR UPDATE;

    IF inventory_row.id IS NULL THEN
      RAISE EXCEPTION 'Inventory item missing for returned product %', order_item_row.product_id;
    END IF;

    UPDATE inventory_items
    SET quantity = quantity + return_quantity,
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
      'RETURN',
      return_quantity,
      p_reason,
      created_refund_id,
      actor_id
    );
  END LOOP;

  UPDATE orders
  SET status = CASE
    WHEN refunded_total + p_amount >= paid_total THEN 'REFUNDED'::order_status
    ELSE 'PARTIALLY_REFUNDED'::order_status
  END
  WHERE id = p_order_id;

  INSERT INTO audit_logs (user_id, action, entity, entity_id, before, after, ip)
  VALUES (
    actor_id,
    'CREATE_ORDER_REFUND',
    'refunds',
    created_refund_id,
    jsonb_build_object('paid_total', paid_total, 'refunded_total', refunded_total),
    jsonb_build_object('amount', p_amount, 'method', p_method, 'items', p_items),
    p_ip
  );

  RETURN created_refund_id;
END;
$$;
