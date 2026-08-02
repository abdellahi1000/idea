alter table public.identity_verification
  add column match_similarity numeric,
  add column matched_at timestamptz;

-- Extend Phase 1's column guard: status/reviewed_by/rejection_reason were
-- already protected; match_similarity/matched_at need the same protection,
-- but the verify-identity Edge Function (running as service_role) must be
-- able to write them.
create or replace function public.guard_identity_verification_review_columns()
returns trigger
language plpgsql
as $$
begin
  if (new.status is distinct from old.status
      or new.reviewed_by is distinct from old.reviewed_by
      or new.rejection_reason is distinct from old.rejection_reason
      or new.match_similarity is distinct from old.match_similarity
      or new.matched_at is distinct from old.matched_at)
     and auth.role() <> 'service_role'
     and coalesce(current_setting('app.allow_identity_review', true), 'false') <> 'true' then
    raise exception 'identity_verification review fields can only be changed by the verification process';
  end if;
  return new;
end;
$$;

alter publication supabase_realtime add table public.identity_verification;
