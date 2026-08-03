-- The new/unrecognized device needs to react in real time when the old
-- device approves via QR or an admin approves a face-verification attempt.
alter publication supabase_realtime add table public.device_transfer_requests;
