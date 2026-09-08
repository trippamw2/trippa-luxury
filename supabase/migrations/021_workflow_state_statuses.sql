-- ─── 021_workflow_state_statuses.sql ───────────────────────────────────
-- The concierge workflow engine (src/lib/ai/workflow-engine.ts) persists its
-- ConciergeState values directly as bookings.status. Migration 002 only seeded
-- the 9 admin billing-centric slugs (provisional, confirmed, deposit_paid,
-- balance_due, paid, in_progress, completed, cancelled, refunded), so every
-- workflow create/transition to a state outside that set violated the
-- bookings_status_fkey constraint (e.g. "new", "qualifying", "deposit-paid").
--
-- Add the missing workflow states as first-class booking_statuses rows so the
-- FK passes and the admin dashboard can render them.

INSERT INTO booking_statuses (slug, name, color, sort_order) VALUES
  ('new',           'New Enquiry',      'blue',     10),
  ('qualifying',    'Qualifying',       'indigo',   11),
  ('curating',      'Curating Journey', 'purple',   12),
  ('quoted',        'Quote Sent',       'amber',    13),
  ('reviewing',     'Client Reviewing', 'orange',   14),
  ('deposit-paid',  'Deposit Paid',     'blue',     15),
  ('itinerary-sent','Itinerary Sent',   'green',    16),
  ('in-progress',   'In Residence',     'sky',      17),
  ('follow-up',     'Follow-up',        'violet',   18),
  ('archived',      'Archived',         'gray',     19)
ON CONFLICT (slug) DO NOTHING;