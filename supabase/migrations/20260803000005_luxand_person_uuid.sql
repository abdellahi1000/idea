-- Links a JOJO Face Identity to its enrolled person record in whichever AI
-- face-verification provider is currently configured (see
-- admin/app/services/ai/ - the provider is swappable, this column just
-- stores the opaque identifier the provider gave us for that person).
-- Admin/service-role only: never selected by the mobile app.
alter table public.face_identities
  add column if not exists ai_provider text,
  add column if not exists ai_person_uuid text;
