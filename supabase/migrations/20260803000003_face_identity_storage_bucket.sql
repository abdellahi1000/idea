insert into storage.buckets (id, name, public)
values ('face-identity', 'face-identity', false)
on conflict (id) do nothing;

create policy "face_identity_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'face-identity' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "face_identity_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'face-identity' and (storage.foldername(name))[1] = (select auth.uid()::text));
