-- Backfill bartender_slot from legacy crew_duties bar/bartender assignments.
-- This preserves historical bartender visibility for older shows after slot model consolidation.
--
-- Rollback notes:
--   This is a data backfill migration. No schema changes are introduced.
--   To revert inserted rows only:
--     delete from public.bartender_slot bs
--     where bs.claimed_at is not null
--       and exists (
--         select 1
--         from public.crew_duties cd
--         join public.crew_duty_types cdt on cdt.crew_duty_type_id = cd.crew_duty_type_id
--         where cd.show_id = bs.show_id
--           and cd.personnel_id = bs.personnel_id
--           and (
--             lower(trim(coalesce(cdt.duty_name, ''))) = 'bar'
--             or lower(trim(coalesce(cdt.duty_name, ''))) like '%bartender%'
--           )
--       );

with bartender_duty_types as (
  select cdt.crew_duty_type_id
  from public.crew_duty_types cdt
  where lower(trim(coalesce(cdt.duty_name, ''))) = 'bar'
     or lower(trim(coalesce(cdt.duty_name, ''))) like '%bartender%'
),
legacy_bartender_assignments as (
  select
    cd.show_id,
    cd.personnel_id,
    cd.duty_id,
    row_number() over (
      partition by cd.show_id
      order by cd.duty_id desc
    ) as rn
  from public.crew_duties cd
  join bartender_duty_types bdt
    on bdt.crew_duty_type_id = cd.crew_duty_type_id
  where cd.personnel_id is not null
),
latest_legacy_by_show as (
  select
    lba.show_id,
    lba.personnel_id
  from legacy_bartender_assignments lba
  where lba.rn = 1
)
insert into public.bartender_slot (show_id, personnel_id, is_locked, claimed_at, updated_at)
select
  ll.show_id,
  ll.personnel_id,
  false,
  now(),
  now()
from latest_legacy_by_show ll
left join public.bartender_slot bs
  on bs.show_id = ll.show_id
where bs.show_id is null;

with bartender_duty_types as (
  select cdt.crew_duty_type_id
  from public.crew_duty_types cdt
  where lower(trim(coalesce(cdt.duty_name, ''))) = 'bar'
     or lower(trim(coalesce(cdt.duty_name, ''))) like '%bartender%'
),
legacy_bartender_assignments as (
  select
    cd.show_id,
    cd.personnel_id,
    cd.duty_id,
    row_number() over (
      partition by cd.show_id
      order by cd.duty_id desc
    ) as rn
  from public.crew_duties cd
  join bartender_duty_types bdt
    on bdt.crew_duty_type_id = cd.crew_duty_type_id
  where cd.personnel_id is not null
),
latest_legacy_by_show as (
  select
    lba.show_id,
    lba.personnel_id
  from legacy_bartender_assignments lba
  where lba.rn = 1
)
update public.bartender_slot bs
set
  personnel_id = ll.personnel_id,
  claimed_at = coalesce(bs.claimed_at, now()),
  updated_at = now()
from latest_legacy_by_show ll
where bs.show_id = ll.show_id
  and bs.personnel_id is null
  and ll.personnel_id is not null;