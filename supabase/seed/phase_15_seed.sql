-- Demo store with INR
INSERT INTO stores (id, name, address, phone, currency, timezone)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Main Branch', '123 MG Road, Bengaluru, KA 560001', '+91-80-12345678', 'INR', 'Asia/Kolkata')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    currency = EXCLUDED.currency,
    timezone = EXCLUDED.timezone;

-- Create users through Supabase Auth Dashboard or supabase.auth.admin.createUser().
-- Then update the generated profile:
-- UPDATE profiles
-- SET role = 'SUPER_ADMIN', name = 'Admin User', store_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
-- WHERE id = '<auth_user_uuid>';

INSERT INTO categories (id, name, slug) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Hot Drinks', 'hot-drinks'),
  ('22222222-2222-4222-8222-222222222222', 'Food & Snacks', 'food-snacks'),
  ('33333333-3333-4333-8333-333333333333', 'Cold Drinks', 'cold-drinks'),
  ('44444444-4444-4444-8444-444444444444', 'Bakery', 'bakery'),
  ('55555555-5555-4555-8555-555555555555', 'Retail', 'retail')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO products (
  id, name, slug, sku, barcode, description, category_id, cost_price, selling_price, tax_rate, discountable, is_active
) VALUES
  ('aaaaaaaa-0001-4000-8000-000000000001', 'Americano', 'americano', 'DRK-101', '890100001', 'Fresh brewed coffee', '11111111-1111-4111-8111-111111111111', 80, 180, 13, true, true),
  ('aaaaaaaa-0002-4000-8000-000000000002', 'Chicken Momo', 'chicken-momo', 'FOD-214', '890100002', 'Steamed chicken dumplings', '22222222-2222-4222-8222-222222222222', 130, 260, 13, true, true),
  ('aaaaaaaa-0003-4000-8000-000000000003', 'Veg Chowmein', 'veg-chowmein', 'FOD-188', '890100003', 'Stir fried noodles', '22222222-2222-4222-8222-222222222222', 105, 220, 13, true, true),
  ('aaaaaaaa-0004-4000-8000-000000000004', 'Mineral Water', 'mineral-water', 'DRK-019', '890100004', 'Bottled drinking water', '33333333-3333-4333-8333-333333333333', 18, 40, 13, true, true),
  ('aaaaaaaa-0005-4000-8000-000000000005', 'Masala Tea', 'masala-tea', 'DRK-115', '890100005', 'Spiced milk tea', '11111111-1111-4111-8111-111111111111', 35, 90, 13, true, true),
  ('aaaaaaaa-0006-4000-8000-000000000006', 'Cafe Latte', 'cafe-latte', 'DRK-122', '890100006', 'Espresso with steamed milk', '11111111-1111-4111-8111-111111111111', 95, 210, 13, true, true),
  ('aaaaaaaa-0007-4000-8000-000000000007', 'Chocolate Muffin', 'chocolate-muffin', 'BAK-042', '890100007', 'Rich chocolate muffin', '44444444-4444-4444-8444-444444444444', 70, 150, 13, true, true),
  ('aaaaaaaa-0008-4000-8000-000000000008', 'Veg Sandwich', 'veg-sandwich', 'FOD-305', '890100008', 'Grilled vegetable sandwich', '22222222-2222-4222-8222-222222222222', 85, 190, 13, true, true),
  ('aaaaaaaa-0009-4000-8000-000000000009', 'Orange Juice', 'orange-juice', 'DRK-220', '890100009', 'Fresh orange juice', '33333333-3333-4333-8333-333333333333', 90, 200, 13, true, true),
  ('aaaaaaaa-0010-4000-8000-000000000010', 'Notebook A5', 'notebook-a5', 'RTL-044', '890100010', 'Ruled A5 notebook', '55555555-5555-4555-8555-555555555555', 45, 90, 5, true, true)
ON CONFLICT (sku) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    barcode = EXCLUDED.barcode,
    description = EXCLUDED.description,
    category_id = EXCLUDED.category_id,
    cost_price = EXCLUDED.cost_price,
    selling_price = EXCLUDED.selling_price,
    tax_rate = EXCLUDED.tax_rate,
    is_active = true,
    deleted_at = null;

INSERT INTO product_variants (id, product_id, name, sku, barcode, price_modifier, attributes)
VALUES ('cccccccc-0001-4000-8000-000000000001', 'aaaaaaaa-0002-4000-8000-000000000002', 'Spicy', 'FOD-214-SP', '890100012', 20, '{"heat":"medium"}')
ON CONFLICT (sku) DO UPDATE
SET name = EXCLUDED.name,
    barcode = EXCLUDED.barcode,
    price_modifier = EXCLUDED.price_modifier,
    attributes = EXCLUDED.attributes,
    deleted_at = null;

INSERT INTO inventory_items (id, product_id, store_id, quantity, reorder_point, reorder_qty, location)
VALUES
  ('bbbbbbbb-0001-4000-8000-000000000001', 'aaaaaaaa-0001-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 48, 10, 50, 'Front shelf'),
  ('bbbbbbbb-0002-4000-8000-000000000002', 'aaaaaaaa-0002-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 22, 8, 50, 'Back counter'),
  ('bbbbbbbb-0003-4000-8000-000000000003', 'aaaaaaaa-0003-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 16, 8, 50, 'Front shelf'),
  ('bbbbbbbb-0004-4000-8000-000000000004', 'aaaaaaaa-0004-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 96, 20, 50, 'Back counter'),
  ('bbbbbbbb-0005-4000-8000-000000000005', 'aaaaaaaa-0005-4000-8000-000000000005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 54, 12, 50, 'Front shelf'),
  ('bbbbbbbb-0006-4000-8000-000000000006', 'aaaaaaaa-0006-4000-8000-000000000006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 30, 10, 50, 'Back counter'),
  ('bbbbbbbb-0007-4000-8000-000000000007', 'aaaaaaaa-0007-4000-8000-000000000007', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 18, 6, 50, 'Front shelf'),
  ('bbbbbbbb-0008-4000-8000-000000000008', 'aaaaaaaa-0008-4000-8000-000000000008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 14, 8, 50, 'Back counter'),
  ('bbbbbbbb-0009-4000-8000-000000000009', 'aaaaaaaa-0009-4000-8000-000000000009', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 25, 10, 50, 'Front shelf'),
  ('bbbbbbbb-0010-4000-8000-000000000010', 'aaaaaaaa-0010-4000-8000-000000000010', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 6, 10, 50, 'Back counter')
ON CONFLICT (product_id, store_id) DO UPDATE
SET quantity = EXCLUDED.quantity,
    reorder_point = EXCLUDED.reorder_point,
    reorder_qty = EXCLUDED.reorder_qty,
    location = EXCLUDED.location,
    deleted_at = null;

INSERT INTO customers (id, name, email, phone, loyalty_points, tier)
VALUES
  ('dddddddd-0001-4000-8000-000000000001', 'Walk-in Premium', null, '+91-9000000001', 120, 'SILVER'),
  ('dddddddd-0002-4000-8000-000000000002', 'Asha Sharma', 'asha@example.com', '+91-9000000002', 540, 'GOLD'),
  ('dddddddd-0003-4000-8000-000000000003', 'Bibek Gurung', 'bibek@example.com', '+977-9800000003', 310, 'SILVER'),
  ('dddddddd-0004-4000-8000-000000000004', 'Nisha Thapa', 'nisha@example.com', '+977-9800000004', 760, 'GOLD'),
  ('dddddddd-0005-4000-8000-000000000005', 'Rohan Mehta', 'rohan@example.com', '+91-9000000005', 80, 'STANDARD'),
  ('dddddddd-0006-4000-8000-000000000006', 'Priya Rai', 'priya@example.com', '+977-9800000006', 1020, 'PLATINUM'),
  ('dddddddd-0007-4000-8000-000000000007', 'Kiran Shrestha', 'kiran@example.com', '+977-9800000007', 210, 'SILVER'),
  ('dddddddd-0008-4000-8000-000000000008', 'Maya Lama', 'maya@example.com', '+977-9800000008', 450, 'GOLD'),
  ('dddddddd-0009-4000-8000-000000000009', 'Sanjay Singh', 'sanjay@example.com', '+91-9000000009', 40, 'STANDARD'),
  ('dddddddd-0010-4000-8000-000000000010', 'Tara KC', 'tara@example.com', '+977-9800000010', 630, 'GOLD')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    loyalty_points = EXCLUDED.loyalty_points,
    tier = EXCLUDED.tier,
    deleted_at = null;

INSERT INTO payment_scanner_settings (id, provider, merchant_name)
VALUES ('phonepe_qr', 'ESEWA_QR', 'Dipen Store')
ON CONFLICT (id) DO UPDATE
SET provider = 'ESEWA_QR',
    merchant_name = COALESCE(payment_scanner_settings.merchant_name, EXCLUDED.merchant_name);
