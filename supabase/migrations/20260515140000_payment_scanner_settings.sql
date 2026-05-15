CREATE TABLE IF NOT EXISTS payment_scanner_settings (
  id            TEXT PRIMARY KEY DEFAULT 'phonepe_qr',
  provider      TEXT NOT NULL DEFAULT 'PHONEPE_QR',
  qr_image_url  TEXT,
  storage_path  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER payment_scanner_settings_set_updated_at
  BEFORE UPDATE ON payment_scanner_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE payment_scanner_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_scanner_settings_read ON payment_scanner_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY payment_scanner_settings_admin_write ON payment_scanner_settings
  FOR ALL USING (current_profile_role() IN ('SUPER_ADMIN','ADMIN','MANAGER'))
  WITH CHECK (current_profile_role() IN ('SUPER_ADMIN','ADMIN','MANAGER'));

INSERT INTO payment_scanner_settings (id, provider)
VALUES ('phonepe_qr', 'PHONEPE_QR')
ON CONFLICT (id) DO NOTHING;
