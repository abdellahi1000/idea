-- Admin_web.docx requires "IP Address" and "Result" as first-class audit
-- log fields, not buried in metadata.

alter table public.audit_logs
  add column ip_address text,
  add column result text not null default 'success' check (result in ('success', 'failure'));
