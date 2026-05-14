CREATE OR REPLACE FUNCTION record_inventory_movement(
  p_inventory_item_id UUID,
  p_type movement_type,
  p_quantity INT,
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_performed_by_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := COALESCE(p_performed_by_id, auth.uid());
  actor_role user_role;
  actor_store_id UUID;
  inventory_row inventory_items%ROWTYPE;
  before_row JSONB;
  after_row JSONB;
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

  SELECT * INTO inventory_row
  FROM inventory_items
  WHERE id = p_inventory_item_id AND deleted_at IS NULL
  FOR UPDATE;

  IF inventory_row.id IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  IF actor_role <> 'SUPER_ADMIN' AND actor_store_id <> inventory_row.store_id THEN
    RAISE EXCEPTION 'Cannot adjust inventory outside assigned store';
  END IF;

  IF p_type = 'ADJUSTMENT' AND actor_role NOT IN ('SUPER_ADMIN','ADMIN','MANAGER') THEN
    RAISE EXCEPTION 'Only managers and admins can manually adjust stock';
  END IF;

  IF p_quantity = 0 THEN
    RAISE EXCEPTION 'Movement quantity cannot be zero';
  END IF;

  IF inventory_row.quantity + p_quantity < 0 THEN
    RAISE EXCEPTION 'Inventory quantity cannot become negative';
  END IF;

  before_row := to_jsonb(inventory_row);

  UPDATE inventory_items
  SET quantity = quantity + p_quantity,
      updated_at = now()
  WHERE id = p_inventory_item_id
  RETURNING * INTO inventory_row;

  after_row := to_jsonb(inventory_row);

  INSERT INTO inventory_movements (
    inventory_item_id,
    type,
    quantity,
    reason,
    reference_id,
    performed_by_id
  )
  VALUES (
    p_inventory_item_id,
    p_type,
    p_quantity,
    p_reason,
    p_reference_id,
    actor_id
  );

  INSERT INTO audit_logs (
    user_id,
    action,
    entity,
    entity_id,
    before,
    after
  )
  VALUES (
    actor_id,
    'RECORD_INVENTORY_MOVEMENT',
    'inventory_items',
    p_inventory_item_id,
    before_row,
    after_row
  );
END;
$$;

CREATE OR REPLACE FUNCTION record_order_return_inventory(
  p_order_id UUID,
  p_items JSONB,
  p_reason TEXT DEFAULT 'Order return'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  actor_role user_role;
  actor_store_id UUID;
  order_row orders%ROWTYPE;
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
    RAISE EXCEPTION 'Cannot return inventory outside assigned store';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
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

    PERFORM record_inventory_movement(
      inventory_row.id,
      'RETURN',
      return_quantity,
      p_reason,
      p_order_id,
      actor_id
    );
  END LOOP;
END;
$$;
