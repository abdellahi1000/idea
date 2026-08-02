alter table public.device_transfer_requests
  add column verification_method text check (verification_method in ('qr_code', 'face_id', 'fingerprint'));

-- Free-text notes for admin use only - never surfaced to the mobile app.
alter table public.profiles add column admin_notes text;
