ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'ESEWA_QR';

UPDATE payment_scanner_settings
SET provider = 'ESEWA_QR'
WHERE id = 'phonepe_qr';
