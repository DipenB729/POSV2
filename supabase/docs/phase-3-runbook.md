# Phase 3 Supabase SQL Database Design

Run `supabase/migrations/20260514180000_phase_3_pos_schema.sql` in the Supabase Dashboard SQL Editor, or apply it with the Supabase CLI after linking the project.

Application queries should use Supabase JS clients. Transaction-sensitive writes should use RPC calls:

- `create_pos_order(...)` for checkout, order item insertion, payment insertion, inventory decrement, inventory movements, and audit logging.
- `create_order_refund(...)` for refund creation and order refund status updates.
- `record_inventory_movement(...)` for manual stock adjustments and any stock delta that must write an `inventory_movements` row.
- `record_order_return_inventory(...)` for atomic return inventory increments tied to an order.
- `create_pending_phonepe_order(...)` for creating a pending order before PhonePe confirmation without decrementing stock.
- `confirm_phonepe_order_payment(...)` for marking PhonePe payment complete and atomically decrementing inventory.

The migration enables RLS on all application tables and grants read/write behavior by profile role and store scope. Server-side service-role API routes can bypass RLS when needed for trusted operational workflows.
