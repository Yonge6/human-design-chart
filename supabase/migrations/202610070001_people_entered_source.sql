-- Simplified form records manual entry, not an invented permission assertion.
begin;
alter table public.buer_people drop constraint buer_people_source_check;
alter table public.buer_people add constraint buer_people_source_check
 check (source in ('self','permission','confirmed','guardian','entered'));
commit;
