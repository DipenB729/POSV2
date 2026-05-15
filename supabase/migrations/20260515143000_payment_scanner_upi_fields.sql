ALTER TABLE payment_scanner_settings
ADD COLUMN IF NOT EXISTS upi_id TEXT,
ADD COLUMN IF NOT EXISTS merchant_name TEXT;

UPDATE payment_scanner_settings
SET merchant_name = COALESCE(merchant_name, 'Foodigo')
WHERE id = 'phonepe_qr';
