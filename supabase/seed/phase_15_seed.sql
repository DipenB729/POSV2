-- Store with INR
INSERT INTO stores (name, address, phone, currency, timezone)
VALUES ('Main Branch', '123 MG Road, Bengaluru, KA 560001', '+91-80-12345678', 'INR', 'Asia/Kolkata');

-- Create users through Supabase Auth Dashboard or supabase.auth.admin.createUser().
-- Then update the generated profile:
-- UPDATE profiles
-- SET role = 'SUPER_ADMIN', name = 'Admin User', store_id = '<store_uuid>'
-- WHERE id = '<auth_user_uuid>';

-- Sample categories
INSERT INTO categories (name, slug) VALUES
  ('Electronics', 'electronics'),
  ('Food & Beverages', 'food-beverages'),
  ('Clothing', 'clothing'),
  ('Stationery', 'stationery'),
  ('Other', 'other')
ON CONFLICT (slug) DO NOTHING;
