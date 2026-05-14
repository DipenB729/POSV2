CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN','ADMIN','MANAGER','CASHIER','INVENTORY_CLERK');
CREATE TYPE order_status AS ENUM ('PENDING','COMPLETED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED');
CREATE TYPE payment_method AS ENUM ('CASH','CARD','PHONEPE_QR','MOBILE_MONEY','GIFT_CARD','CREDIT');
CREATE TYPE payment_status AS ENUM ('PENDING','COMPLETED','FAILED','REFUNDED');
CREATE TYPE movement_type AS ENUM ('SALE','RETURN','PURCHASE_RECEIVED','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','DAMAGE');
CREATE TYPE discount_type AS ENUM ('PERCENTAGE','FIXED_AMOUNT','BUY_X_GET_Y');
CREATE TYPE customer_tier AS ENUM ('STANDARD','SILVER','GOLD','PLATINUM');

-- STORES
CREATE TABLE stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  phone       TEXT,
  tax_id      TEXT,
  currency    TEXT NOT NULL DEFAULT 'INR',
  timezone    TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- PROFILES EXTEND SUPABASE auth.users
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  role        user_role NOT NULL DEFAULT 'CASHIER',
  store_id    UUID REFERENCES stores(id),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 'CASHIER');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- CATEGORIES
CREATE TABLE categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  description  TEXT,
  image_url    TEXT,
  parent_id    UUID REFERENCES categories(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

-- SUPPLIERS
CREATE TABLE suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- PRODUCTS
CREATE TABLE products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  sku            TEXT UNIQUE NOT NULL,
  barcode        TEXT UNIQUE,
  description    TEXT,
  image_url      TEXT,
  category_id    UUID NOT NULL REFERENCES categories(id),
  supplier_id    UUID REFERENCES suppliers(id),
  cost_price     NUMERIC(10,2) NOT NULL,
  selling_price  NUMERIC(10,2) NOT NULL,
  tax_rate       NUMERIC(5,2) DEFAULT 0,
  discountable   BOOLEAN DEFAULT true,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE product_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  sku             TEXT UNIQUE NOT NULL,
  barcode         TEXT,
  price_modifier  NUMERIC(10,2) DEFAULT 0,
  attributes      JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- INVENTORY
CREATE TABLE inventory_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products(id),
  store_id       UUID NOT NULL REFERENCES stores(id),
  quantity       INT DEFAULT 0,
  reorder_point  INT DEFAULT 10,
  reorder_qty    INT DEFAULT 50,
  location       TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  UNIQUE(product_id, store_id)
);

CREATE TABLE inventory_movements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id  UUID NOT NULL REFERENCES inventory_items(id),
  type               movement_type NOT NULL,
  quantity           INT NOT NULL,
  reason             TEXT,
  reference_id       UUID,
  performed_by_id    UUID NOT NULL REFERENCES profiles(id),
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- CUSTOMERS
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE,
  phone           TEXT,
  address         TEXT,
  loyalty_points  INT DEFAULT 0,
  tier            customer_tier DEFAULT 'STANDARD',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- DISCOUNTS
CREATE TABLE discounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT UNIQUE,
  name             TEXT NOT NULL,
  type             discount_type NOT NULL,
  value            NUMERIC(10,2) NOT NULL,
  min_order_value  NUMERIC(10,2),
  max_usage        INT,
  usage_count      INT DEFAULT 0,
  starts_at        TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

-- ORDERS
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT UNIQUE NOT NULL,
  store_id         UUID NOT NULL REFERENCES stores(id),
  cashier_id       UUID NOT NULL REFERENCES profiles(id),
  customer_id      UUID REFERENCES customers(id),
  discount_id      UUID REFERENCES discounts(id),
  status           order_status DEFAULT 'PENDING',
  subtotal         NUMERIC(10,2) NOT NULL,
  tax_amount       NUMERIC(10,2) NOT NULL,
  discount_amount  NUMERIC(10,2) DEFAULT 0,
  total_amount     NUMERIC(10,2) NOT NULL,
  amount_paid      NUMERIC(10,2) NOT NULL DEFAULT 0,
  change_due       NUMERIC(10,2) DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  variant_id  UUID REFERENCES product_variants(id),
  name        TEXT NOT NULL,
  sku         TEXT NOT NULL,
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL,
  tax_rate    NUMERIC(5,2) NOT NULL,
  discount    NUMERIC(10,2) DEFAULT 0,
  line_total  NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- PAYMENTS AND REFUNDS
CREATE TABLE payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id),
  method      payment_method NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  status      payment_status DEFAULT 'PENDING',
  reference   TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE refunds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id),
  amount      NUMERIC(10,2) NOT NULL,
  reason      TEXT NOT NULL,
  method      payment_method NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- AUDIT
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  before      JSONB,
  after       JSONB,
  ip          TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_profiles_store ON profiles(store_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_cashier ON orders(cashier_id);
CREATE INDEX idx_inventory_product_store ON inventory_items(product_id, store_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_reference ON payments(reference);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);

-- UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stores_set_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER suppliers_set_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER inventory_items_set_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER discounts_set_updated_at BEFORE UPDATE ON discounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROW LEVEL SECURITY POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_profile_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND deleted_at IS NULL AND is_active = true
$$;

CREATE OR REPLACE FUNCTION current_profile_store_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM profiles WHERE id = auth.uid() AND deleted_at IS NULL AND is_active = true
$$;

CREATE OR REPLACE FUNCTION is_store_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_profile_role() IN ('SUPER_ADMIN','ADMIN','MANAGER')
$$;

-- Profiles: users can read their own profile. Admin roles can read profiles in their store.
CREATE POLICY profiles_self_read ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_store_admin_read ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('SUPER_ADMIN','ADMIN','MANAGER')
      AND (p.role = 'SUPER_ADMIN' OR p.store_id = profiles.store_id)
    )
  );

CREATE POLICY profiles_admin_write ON profiles
  FOR ALL USING (
    current_profile_role() = 'SUPER_ADMIN'
    OR (current_profile_role() IN ('ADMIN','MANAGER') AND store_id = current_profile_store_id())
  )
  WITH CHECK (
    current_profile_role() = 'SUPER_ADMIN'
    OR (current_profile_role() IN ('ADMIN','MANAGER') AND store_id = current_profile_store_id())
  );

CREATE POLICY stores_read ON stores
  FOR SELECT USING (
    current_profile_role() = 'SUPER_ADMIN'
    OR id = current_profile_store_id()
  );

CREATE POLICY stores_admin_write ON stores
  FOR ALL USING (current_profile_role() IN ('SUPER_ADMIN','ADMIN'))
  WITH CHECK (current_profile_role() IN ('SUPER_ADMIN','ADMIN'));

-- Product catalog can be read by authenticated users.
CREATE POLICY categories_read ON categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY suppliers_read ON suppliers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY products_read ON products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY product_variants_read ON product_variants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY discounts_read ON discounts FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY categories_write ON categories
  FOR ALL USING (current_profile_role() IN ('ADMIN','MANAGER','SUPER_ADMIN'))
  WITH CHECK (current_profile_role() IN ('ADMIN','MANAGER','SUPER_ADMIN'));

CREATE POLICY suppliers_write ON suppliers
  FOR ALL USING (current_profile_role() IN ('ADMIN','MANAGER','SUPER_ADMIN'))
  WITH CHECK (current_profile_role() IN ('ADMIN','MANAGER','SUPER_ADMIN'));

CREATE POLICY products_write ON products
  FOR ALL USING (current_profile_role() IN ('ADMIN','MANAGER','SUPER_ADMIN'))
  WITH CHECK (current_profile_role() IN ('ADMIN','MANAGER','SUPER_ADMIN'));

CREATE POLICY product_variants_write ON product_variants
  FOR ALL USING (current_profile_role() IN ('ADMIN','MANAGER','SUPER_ADMIN'))
  WITH CHECK (current_profile_role() IN ('ADMIN','MANAGER','SUPER_ADMIN'));

CREATE POLICY discounts_write ON discounts
  FOR ALL USING (current_profile_role() IN ('ADMIN','MANAGER','SUPER_ADMIN'))
  WITH CHECK (current_profile_role() IN ('ADMIN','MANAGER','SUPER_ADMIN'));

-- Store-scoped records.
CREATE POLICY orders_store_isolation ON orders
  FOR SELECT USING (
    store_id = current_profile_store_id()
    OR current_profile_role() = 'SUPER_ADMIN'
  );

CREATE POLICY inventory_store_isolation ON inventory_items
  FOR SELECT USING (
    store_id = current_profile_store_id()
    OR current_profile_role() = 'SUPER_ADMIN'
  );

CREATE POLICY inventory_admin_write ON inventory_items
  FOR ALL USING (
    current_profile_role() IN ('SUPER_ADMIN','ADMIN','MANAGER','INVENTORY_CLERK')
    AND (current_profile_role() = 'SUPER_ADMIN' OR store_id = current_profile_store_id())
  )
  WITH CHECK (
    current_profile_role() IN ('SUPER_ADMIN','ADMIN','MANAGER','INVENTORY_CLERK')
    AND (current_profile_role() = 'SUPER_ADMIN' OR store_id = current_profile_store_id())
  );

CREATE POLICY inventory_movements_store_read ON inventory_movements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inventory_items ii
      WHERE ii.id = inventory_movements.inventory_item_id
      AND (ii.store_id = current_profile_store_id() OR current_profile_role() = 'SUPER_ADMIN')
    )
  );

CREATE POLICY customers_read ON customers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY customers_write ON customers
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY order_items_store_read ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND (o.store_id = current_profile_store_id() OR current_profile_role() = 'SUPER_ADMIN')
    )
  );

CREATE POLICY payments_store_read ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payments.order_id
      AND (o.store_id = current_profile_store_id() OR current_profile_role() = 'SUPER_ADMIN')
    )
  );

CREATE POLICY refunds_store_read ON refunds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = refunds.order_id
      AND (o.store_id = current_profile_store_id() OR current_profile_role() = 'SUPER_ADMIN')
    )
  );

CREATE POLICY audit_logs_admin_read ON audit_logs
  FOR SELECT USING (is_store_admin());

-- RPC FUNCTIONS FOR TRANSACTIONAL WORKFLOWS
CREATE OR REPLACE FUNCTION next_order_number(p_store_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_value BIGINT;
BEGIN
  SELECT count(*) + 1
  INTO next_value
  FROM orders
  WHERE store_id = p_store_id
  AND created_at::date = CURRENT_DATE;

  RETURN 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(next_value::text, 5, '0');
END;
$$;

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

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    item_product_id := (item->>'product_id')::UUID;
    item_variant_id := NULLIF(item->>'variant_id', '')::UUID;
    item_quantity := (item->>'quantity')::INT;
    item_discount := COALESCE((item->>'discount')::NUMERIC, 0);

    IF item_quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be positive';
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
    CASE WHEN paid_total >= grand_total THEN 'COMPLETED'::order_status ELSE 'PENDING'::order_status END,
    subtotal_total,
    tax_total,
    discount_total,
    grand_total,
    paid_total,
    GREATEST(paid_total - grand_total, 0),
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

CREATE OR REPLACE FUNCTION create_order_refund(
  p_order_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_method payment_method,
  p_metadata JSONB DEFAULT NULL
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
  created_refund_id UUID;
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
  INTO refunded_total
  FROM refunds
  WHERE order_id = p_order_id;

  IF p_amount <= 0 OR refunded_total + p_amount > order_row.total_amount THEN
    RAISE EXCEPTION 'Invalid refund amount';
  END IF;

  INSERT INTO refunds (order_id, amount, reason, method, metadata)
  VALUES (p_order_id, p_amount, p_reason, p_method, p_metadata)
  RETURNING id INTO created_refund_id;

  UPDATE orders
  SET status = CASE
    WHEN refunded_total + p_amount >= total_amount THEN 'REFUNDED'::order_status
    ELSE 'PARTIALLY_REFUNDED'::order_status
  END
  WHERE id = p_order_id;

  INSERT INTO audit_logs (user_id, action, entity, entity_id, after)
  VALUES (actor_id, 'CREATE_ORDER_REFUND', 'refunds', created_refund_id, jsonb_build_object('amount', p_amount));

  RETURN created_refund_id;
END;
$$;

-- Service-role API routes can bypass RLS for server-side transactional workflows.
