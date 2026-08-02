-- Creates the two Storage buckets used by the mobile app, both private.
-- Mobile reads via createSignedUrl(); never via public URLs.

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', false),
  ('identity-documents', 'identity-documents', false)
on conflict (id) do nothing;

-- avatars: per-user folder prefix, full CRUD on own files.
create policy "avatars_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- identity-documents: per-user folder prefix, insert + select only. No
-- update/delete once submitted - a new submission uploads to a new path
-- instead, preserving the original for the review trail.
create policy "identity_documents_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "identity_documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = (select auth.uid()::text));
